import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";

const reviewSchema = z.object({
  paymentId: z.number().int().positive(),
  action: z.enum(["PAID", "REJECTED"]),
});

const deny = () => NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });
  if (!(await isAdmin(viewer.uid))) return deny();

  const status = req.nextUrl.searchParams.get("status");
  const payments = await db.payment.findMany({
    where: status === "PENDING" || status === "PAID" || status === "REJECTED" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      plan: true,
      status: true,
      proof: true,
      periodEnd: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });
  if (!(await isAdmin(viewer.uid))) return deny();

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: parsed.data.paymentId },
      select: { id: true, tenantId: true, plan: true, status: true, periodEnd: true },
    });
    if (!payment) return { error: "Pembayaran tidak ditemukan.", status: 404 } as const;
    if (payment.status !== "PENDING") return { error: "Pembayaran sudah ditinjau.", status: 409 } as const;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: parsed.data.action,
        reviewedAt: new Date(),
        reviewedBy: viewer.uid,
      },
    });

    if (parsed.data.action === "PAID") {
      await tx.subscription.upsert({
        where: { tenantId: payment.tenantId },
        update: {
          plan: payment.plan,
          status: "ACTIVE",
          currentPeriodEnd: payment.periodEnd,
        },
        create: {
          tenantId: payment.tenantId,
          plan: payment.plan,
          status: "ACTIVE",
          currentPeriodEnd: payment.periodEnd,
        },
      });
    }
    return { ok: true, tenantId: payment.tenantId } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  void audit({
    action: parsed.data.action === "PAID" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
    userId: viewer.uid,
    tenantId: result.tenantId,
    entity: "Payment",
    entityId: parsed.data.paymentId,
    req,
  });
  return NextResponse.json({ ok: true });
}
