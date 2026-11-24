import { redirect } from "next/navigation";
import { isAgency } from "@/lib/agency";
import { isAdmin } from "@/lib/admin";
import { currentViewer } from "@/lib/auth";
import { activeTenantId, listMemberships } from "@/lib/tenant";

export async function requirePageContext() {
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");

  const tenantId = await activeTenantId();
  const memberships = await listMemberships(viewer.uid);
  if (!tenantId || !memberships.some((item) => item.tenantId === tenantId)) {
    redirect("/login");
  }

  const [agency, admin] = await Promise.all([isAgency(viewer.uid), isAdmin(viewer.uid)]);
  return { viewer, tenantId, memberships, isAgency: agency, isAdmin: admin };
}
