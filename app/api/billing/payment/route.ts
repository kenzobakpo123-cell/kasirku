import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isPaidPlan, nextBillingPeriod, priceFor } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { canManage } from "@/lib/tenant";

const schema = z.object({
  plan: z.string().refine(isPaidPlan, { message: "Paket harus PRO atau AGENCY" }),
  proof: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa mengajukan upgrade." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data pembayaran tidak valid" }, { status: 400 });

  const outletCount = await db.outlet.count({ where: { tenantId: auth.ctx.tenantId } });
  const amount = priceFor(parsed.data.plan, outletCount);
  const period = nextBillingPeriod();

  const payment = await db.payment.create({
    data: {
      tenantId: auth.ctx.tenantId,
      amount,
      plan: parsed.data.plan,
      method: "TRANSFER",
      proof: parsed.data.proof ?? null,
      periodStart: period.start,
      periodEnd: period.end,
    },
    select: { id: true, amount: true, plan: true, status: true, periodEnd: true },
  });

  void audit({
    action: "PAYMENT_REQUEST",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Payment",
    entityId: payment.id,
    req,
  });
  return NextResponse.json({ payment }, { status: 201 });
}
