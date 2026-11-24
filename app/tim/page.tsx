import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TeamClient } from "@/components/team-client";
import { db } from "@/lib/db";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Tim & Outlet" };

export default async function TeamPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  const actorRole = memberships.find((item) => item.tenantId === tenantId)?.role ?? "CASHIER";

  const [members, outlets] = await Promise.all([
    db.membership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.outlet.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
  ]);

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <TeamClient
        members={members}
        viewerId={viewer.uid}
        outlets={outlets}
        actorRole={actorRole}
      />
    </AppShell>
  );
}
