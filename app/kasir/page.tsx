import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { KasirClient } from "@/components/kasir-client";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Kasir" };

export default async function KasirPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <KasirClient />
    </AppShell>
  );
}
