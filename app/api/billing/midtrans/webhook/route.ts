import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { midtransAuth, midtransConfig, verifyNotificationSignature } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

type Notification = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
};

/**
 * Webhook Midtrans. Tanda tangan diverifikasi lokal, lalu status dikonfirmasi
 * ke API Midtrans (tidak dipercaya dari body saja). Idempoten: updateOnly PENDING.
 */
export async function POST(req: NextRequest) {
  const config = midtransConfig();
  if (!config) return NextResponse.json({ error: "Midtrans belum dikonfigurasi" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Notification | null;
  if (!body || !verifyNotificationSignature(body as Record<string, unknown>, config.serverKey)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 });
  }
  const orderId = body.order_id;
  if (!orderId) return NextResponse.json({ error: "order_id wajib" }, { status: 400 });

  let status = body.transaction_status;
  if (!status || status === "pending") {
    const check = await fetch(`${config.apiUrl}/${encodeURIComponent(orderId)}/status`, {
      headers: { Accept: "application/json", Authorization: midtransAuth(config) },
      cache: "no-store",
    });
    if (check.ok) {
      const data = (await check.json()) as { transaction_status?: string; fraud_status?: string };
      status = data.transaction_status;
      if (data.fraud_status) body.fraud_status = data.fraud_status;
    }
  }

  const paid = status === "settlement" || (status === "capture" && body.fraud_status === "accept");
  if (!paid) {
    if (status === "cancel" || status === "deny" || status === "expire") {
      const payment = await db.payment.findFirst({ where: { method: `MIDTRANS_SNAP:${orderId}` }, select: { id: true, tenantId: true } });
      if (payment) {
        await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "REJECTED", reviewedAt: new Date() } });
      }
    }
    return NextResponse.json({ ok: true, paid: false });
  }

  const amount = Number(String(body.gross_amount ?? "").replace(/[^\d]/g, ""));
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { method: `MIDTRANS_SNAP:${orderId}` },
      select: { id: true, tenantId: true, amount: true, plan: true, status: true, periodEnd: true },
    });
    if (!payment) return { error: "Pembayaran tidak ditemukan", status: 404 } as const;
    if (payment.status === "PAID") return { ok: true, duplicate: true } as const;
    if (payment.status !== "PENDING") return { error: "Pembayaran sudah ditinjau", status: 409 } as const;
    if (payment.amount !== amount) return { error: "Nominal tidak cocok", status: 400 } as const;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", reviewedAt: new Date(), proof: `midtrans:${status}:${orderId}` },
    });
    await tx.subscription.upsert({
      where: { tenantId: payment.tenantId },
      update: { plan: payment.plan, status: "ACTIVE", currentPeriodEnd: payment.periodEnd },
      create: { tenantId: payment.tenantId, plan: payment.plan, status: "ACTIVE", currentPeriodEnd: payment.periodEnd },
    });
    return { ok: true, tenantId: payment.tenantId, paymentId: payment.id } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if ("tenantId" in result && result.tenantId) {
    void audit({
      action: "PAYMENT_APPROVED",
      tenantId: result.tenantId,
      entity: "Payment",
      entityId: result.paymentId,
      req,
    });
  }
  return NextResponse.json({ ok: true });
}
