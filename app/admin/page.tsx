import type { Metadata } from "next";
import { AdminClient } from "@/components/admin-client";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin: adminRole } = await requirePageContext();

  if (!adminRole) {
    return (
      <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency}>
        <div className="card">
          <p className="muted">Halaman ini khusus admin.</p>
        </div>
      </AppShell>
    );
  }

  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      plan: true,
      status: true,
      proof: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
  });

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={adminRole}>
      <AdminClient payments={payments} />
    </AppShell>
  );
}
