import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const payments = await db.payment.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      amount: true,
      plan: true,
      status: true,
      proof: true,
      periodEnd: true,
      createdAt: true,
      reviewedAt: true,
    },
  });
  return NextResponse.json({ payments });
}
