import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { dateTime, rupiah } from "@/lib/format";
import { requirePageContext } from "@/lib/page-auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [today, products, recentSales] = await Promise.all([
    db.sale.aggregate({
      where: { tenantId, createdAt: { gte: startOfToday } },
      _sum: { total: true },
      _count: { id: true },
    }),
    db.product.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, stock: true, minStock: true },
      orderBy: { stock: "asc" },
      take: 200,
    }),
    db.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, number: true, total: true, method: true, createdAt: true },
    }),
  ]);

  const lowStock = products.filter((product) => product.stock <= product.minStock).slice(0, 6);

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <div className="page-head">
        <div>
          <h1>Halo, {viewer.name.split(" ")[0]}</h1>
          <p>Ringkasan toko hari ini.</p>
        </div>
        <Link href="/kasir" className="btn btn-primary">
          Buka kasir →
        </Link>
      </div>

      {!viewer.emailVerifiedAt ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          Email kamu belum diverifikasi. <Link href="/akun#verifikasi">Kirim ulang link verifikasi</Link> dari halaman akun.
        </div>
      ) : null}

      <div className="grid grid-3">
        <div className="card stat">
          <div className="label">Penjualan hari ini</div>
          <div className="value">{rupiah(today._sum.total ?? 0)}</div>
          <div className="sub">{today._count.id} transaksi</div>
        </div>
        <div className="card stat">
          <div className="label">Produk aktif</div>
          <div className="value">{products.length}</div>
          <div className="sub">Siap dijual</div>
        </div>
        <div className="card stat">
          <div className="label">Stok menipis</div>
          <div className="value">{lowStock.length}</div>
          <div className="sub">Perlu segera diisi</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h2 className="section-title">Stok menipis</h2>
          {lowStock.length === 0 ? (
            <p className="empty">Semua stok dalam batas aman.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="num">Sisa</th>
                  <th className="num">Min.</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td className="num">
                      <span className="badge badge-warn">{product.stock}</span>
                    </td>
                    <td className="num muted">{product.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Transaksi terakhir</h2>
          {recentSales.length === 0 ? (
            <p className="empty">Belum ada transaksi. Mulai dari kasir.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th className="num">Total</th>
                  <th className="right">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="small">{sale.number}</td>
                    <td className="num">{rupiah(sale.total)}</td>
                    <td className="right small muted">{dateTime(sale.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
