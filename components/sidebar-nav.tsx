"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const items = (isAgency: boolean, isAdmin: boolean): Item[] => [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    href: "/kasir",
    label: "Kasir",
    icon: <svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  },
  {
    href: "/produk",
    label: "Produk & stok",
    icon: <svg viewBox="0 0 24 24" {...stroke}><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 4 9-4M12 11v10" /></svg>,
  },
  {
    href: "/member",
    label: "Member",
    icon: <svg viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 8v6M14 11h6" /></svg>,
  },
  {
    href: "/laporan",
    label: "Laporan",
    icon: <svg viewBox="0 0 24 24" {...stroke}><path d="M4 20V4M4 20h16M7 15l4-5 3 3 5-7" /></svg>,
  },
  {
    href: "/tim",
    label: "Tim & outlet",
    icon: <svg viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 20c0-2.5-1-4.5-2.5-5.5" /></svg>,
  },
  ...(isAgency
    ? [{
        href: "/agency",
        label: "Agensi",
        icon: <svg viewBox="0 0 24 24" {...stroke}><path d="M4 21V6l8-3 8 3v15M9 21v-5h6v5" /></svg>,
      }]
    : []),
  {
    href: "/tagihan",
    label: "Tagihan",
    icon: <svg viewBox="0 0 24 24" {...stroke}><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M9 8h6M9 12h4" /></svg>,
  },
  ...(isAdmin
    ? [{
        href: "/admin",
        label: "Persetujuan",
        icon: <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>,
      }]
    : []),
  {
    href: "/akun",
    label: "Akun & keamanan",
    icon: <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  },
];

export function SidebarNav({
  isAgency,
  isAdmin,
  variant = "sidebar",
}: {
  isAgency: boolean;
  isAdmin: boolean;
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();
  const links = items(isAgency, isAdmin);

  if (variant === "mobile") {
    return (
      <>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <nav className="app-nav" aria-label="Navigasi utama">
      <span className="app-nav-label">Workspace</span>
      {links.slice(0, 5).map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
      <span className="app-nav-label">Pengelolaan</span>
      {links.slice(5).map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
    </nav>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link href={item.href} className={active ? "active" : undefined}>
      {item.icon}
      {item.label}
    </Link>
  );
}
