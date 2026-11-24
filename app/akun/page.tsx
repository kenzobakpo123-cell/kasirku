import type { Metadata } from "next";
import { AccountClient } from "@/components/account-client";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Akun & Keamanan" };

export default async function AccountPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  const sessions = await db.session.findMany({
    where: { userId: viewer.uid, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, label: true, ip: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <AccountClient name={viewer.name} email={viewer.email} sessions={sessions} currentId={viewer.sid} />
    </AppShell>
  );
}
