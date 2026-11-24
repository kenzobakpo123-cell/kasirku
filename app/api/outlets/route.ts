import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { subscriptionPlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { hasCapacity, PLAN_LIMITS } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { canManage } from "@/lib/tenant";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(255).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const outlets = await db.outlet.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ outlets });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa menambah outlet." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data outlet tidak valid" }, { status: 400 });

  const [plan, used] = await Promise.all([
    subscriptionPlan(auth.ctx.tenantId),
    db.outlet.count({ where: { tenantId: auth.ctx.tenantId } }),
  ]);
  if (!hasCapacity(used, PLAN_LIMITS[plan].outlets)) {
    return NextResponse.json(
      { error: `Paket ${plan} hanya mendukung ${PLAN_LIMITS[plan].outlets} outlet. Upgrade ke Pro.`, upgrade: true },
      { status: 402 },
    );
  }

  const outlet = await db.outlet.create({
    data: {
      tenantId: auth.ctx.tenantId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
    },
    select: { id: true, name: true },
  });

  void audit({
    action: "OUTLET_CREATE",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Outlet",
    entityId: outlet.id,
    req,
  });
  return NextResponse.json({ outlet }, { status: 201 });
}
