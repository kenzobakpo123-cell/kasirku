import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import type { MembershipInfo } from "@/lib/tenant";
import { LogoutButton } from "@/components/logout-button";
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
    <>
      <header className="container">
        <nav className="nav">
          <Link href="/dashboard" className="logo">
            <span className="logo-mark">K</span>
            Kasirku
          </Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/kasir">Kasir</Link>
            <Link href="/produk">Produk</Link>
            <Link href="/laporan">Laporan</Link>
            <Link href="/tim">Tim</Link>
            {isAgency ? <Link href="/agency">Agensi</Link> : null}
            <Link href="/tagihan">Tagihan</Link>
            {isAdmin ? <Link href="/admin">Admin</Link> : null}
            <TenantSwitcher memberships={memberships} activeTenantId={activeTenantId} />
            <Link href="/akun" className="small muted">{viewer.email}</Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="container">{children}</main>
      <footer className="footer">
        <div className="container">Kasirku · mode demo</div>
      </footer>
    </>
  );
}
