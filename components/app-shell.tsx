import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import type { MembershipInfo } from "@/lib/tenant";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { TenantSwitcher } from "@/components/tenant-switcher";

export function AppShell({
  viewer,
  memberships,
  activeTenantId,
  isAgency = false,
  isAdmin = false,
  children,
}: {
  viewer: Viewer;
  memberships: MembershipInfo[];
  activeTenantId: number;
  isAgency?: boolean;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/dashboard" className="logo">
          <span className="logo-mark">K</span>
          Kasirku
        </Link>
        <SidebarNav isAgency={isAgency} isAdmin={isAdmin} />
        <div className="sidebar-foot">
          <div className="sidebar-shop">Toko aktif</div>
          <TenantSwitcher memberships={memberships} activeTenantId={activeTenantId} />
          <div className="sidebar-user">
            <Link href="/akun" title={viewer.email}>{viewer.email}</Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="app-main">
        <nav className="mobile-nav" aria-label="Navigasi utama">
          <Link href="/dashboard" className="logo">
            <span className="logo-mark">K</span>
          </Link>
          <SidebarNav isAgency={isAgency} isAdmin={isAdmin} variant="mobile" />
          <div className="mobile-shop">
            <TenantSwitcher memberships={memberships} activeTenantId={activeTenantId} />
          </div>
          <LogoutButton />
        </nav>
        <div className="app-main-inner">{children}</div>
      </div>
    </div>
  );
}
