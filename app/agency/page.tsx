import type { Metadata } from "next";
import { AgencyClient } from "@/components/agency-client";
import { AppShell } from "@/components/app-shell";
import { getAgencySummary, listReferralCodes } from "@/lib/agency";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Dashboard Agensi" };

export default async function AgencyPage() {
  const { viewer, tenantId, memberships, isAgency: agencyRole, isAdmin } = await requirePageContext();
  const shell = (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={agencyRole} isAdmin={isAdmin}>
      <div className="page-head">
        <h1>Dashboard agensi</h1>
      </div>
      <div className="card">
        <p className="muted">
          Akun ini belum memiliki peran <strong>AGENCY</strong>. Peran diberikan otomatis saat klien mendaftar
          memakai kode referral kamu, atau oleh admin.
        </p>
      </div>
    </AppShell>
  );

  if (!agencyRole) return shell;

  const [summary, codes] = await Promise.all([getAgencySummary(viewer.uid), listReferralCodes(viewer.uid)]);
  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={agencyRole} isAdmin={isAdmin}>
      <AgencyClient summary={summary} codes={codes} appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />
    </AppShell>
  );
}
