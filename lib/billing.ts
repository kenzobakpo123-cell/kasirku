import type { Plan } from "@prisma/client";
import { db } from "@/lib/db";

export async function subscriptionPlan(tenantId: number): Promise<Plan> {
  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    select: { plan: true },
  });
  return subscription?.plan ?? "FREE";
}
