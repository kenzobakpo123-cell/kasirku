import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProductsClient } from "@/components/products-client";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Produk" };

export default async function ProductsPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <ProductsClient />
    </AppShell>
  );
}
