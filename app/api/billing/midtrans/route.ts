import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { midtransAuth, midtransConfig } from "@/lib/midtrans";
import { isPaidPlan, nextBillingPeriod, priceFor } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { canManage } from "@/lib/tenant";

const schema = z.object({ plan: z.string().refine(isPaidPlan, { message: "Paket harus PRO atau AGENCY" }) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const config = midtransConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Pembayaran otomatis belum dikonfigurasi. Gunakan transfer manual." },
      { status: 503 },
    );
  }

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa mengajukan upgrade." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });

  const outletCount = await db.outlet.count({ where: { tenantId: auth.ctx.tenantId } });
  const amount = priceFor(parsed.data.plan, outletCount);
  const period = nextBillingPeriod();
  const orderId = `KK-${auth.ctx.tenantId}-${Date.now().toString(36).toUpperCase()}`;

  const payload = {
    transaction_details: { order_id: orderId, gross_amount: amount },
    customer_details: { email: auth.ctx.viewer.email, first_name: auth.ctx.viewer.name },
    item_details: [{ id: parsed.data.plan, name: `Kasirku ${parsed.data.plan}`, price: amount, quantity: 1 }],
    expire_time: new Date(Date.now() + 30 * 60_000).toISOString(),
  };

  const upstream = await fetch(config.snapUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: midtransAuth(config),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const raw = (await upstream.json()) as { token?: string; error_messages?: string[] };
  if (!upstream.ok || !raw.token) {
    return NextResponse.json(
      { error: raw.error_messages?.join(", ") ?? "Gagal membuat pembayaran Midtrans." },
      { status: 502 },
    );
  }

  const payment = await db.payment.create({
    data: {
      tenantId: auth.ctx.tenantId,
      amount,
      plan: parsed.data.plan,
      method: `MIDTRANS_SNAP:${orderId}`,
      proof: null,
      periodStart: period.start,
      periodEnd: period.end,
    },
    select: { id: true },
  });

  void audit({
    action: "PAYMENT_REQUEST",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Payment",
    entityId: payment.id,
    req,
  });

  return NextResponse.json({
    token: raw.token,
    orderId,
    snapUrl: config.isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v2/embed",
    clientKey: config.clientKey,
    amount,
  });
}
