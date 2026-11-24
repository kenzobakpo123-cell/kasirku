import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BillingClient } from "@/components/billing-client";
import { subscriptionPlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Tagihan" };

export default async function BillingPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();

  const [plan, payments, outletCount] = await Promise.all([
    subscriptionPlan(tenantId),
    db.payment.findMany({
      where: { tenantId },
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
    }),
    db.outlet.count({ where: { tenantId } }),
  ]);

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <BillingClient plan={plan} outletCount={outletCount} payments={payments} />
    </AppShell>
  );
}
