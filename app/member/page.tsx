import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MembersClient } from "@/components/members-client";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Member" };

export default async function MemberPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <MembersClient />
    </AppShell>
  );
}
