import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { requirePageContext } from "@/lib/page-auth";
import { groupDaily, parseRange, topProducts } from "@/lib/reports";

export const metadata: Metadata = { title: "Laporan" };

type Search = { from?: string | string[]; to?: string | string[] };

export default async function ReportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { viewer, tenantId, memberships, isAgency, isAdmin } = await requirePageContext();
  const query = await searchParams;
  const range = parseRange(query.from, query.to);

  const [sales, products] = await Promise.all([
    db.sale.findMany({
      where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: "asc" },
      select: {
        number: true,
        total: true,
        discount: true,
        createdAt: true,
        method: true,
        items: { select: { nameSnapshot: true, qty: true, price: true, cost: true } },
      },
    }),
    db.product.findMany({
      where: { tenantId, active: true },
      orderBy: { stock: "asc" },
      select: { name: true, sku: true, price: true, stock: true, minStock: true },
    }),
  ]);

  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cost = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.cost * item.qty, 0),
    0,
  );
  const daily = groupDaily(sales, range);
  const bestSellers = topProducts(sales.flatMap((sale) => sale.items));
  const maxDaily = Math.max(1, ...daily.map((row) => row.total));
  const lowStock = products.filter((product) => product.stock <= product.minStock);
  const exportQuery = `from=${range.fromKey}&to=${range.toKey}`;

  return (
    <AppShell viewer={viewer} memberships={memberships} activeTenantId={tenantId} isAgency={isAgency} isAdmin={isAdmin}>
      <div className="page-head">
        <div>
          <h1>Laporan</h1>
          <p>{range.fromKey} sampai {range.toKey} · semua angka dalam rupiah</p>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <a className="btn btn-ghost btn-sm" href={`/api/reports/export?type=sales&${exportQuery}`}>
            ⬇ Penjualan CSV
          </a>
          <a className="btn btn-ghost btn-sm" href={`/api/reports/export?type=products&${exportQuery}`}>
            ⬇ Produk CSV
          </a>
        </div>
      </div>

      <form className="card toolbar" method="get" style={{ marginBottom: 18 }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Dari</span>
          <input className="input" type="date" name="from" defaultValue={range.fromKey} />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Sampai</span>
          <input className="input" type="date" name="to" defaultValue={range.toKey} />
        </label>
        <button className="btn btn-primary" type="submit">Terapkan</button>
        <Link className="btn btn-ghost" href="/laporan">Reset</Link>
      </form>

      <div className="grid grid-3">
        <div className="card stat">
          <div className="label">Penjualan</div>
          <div className="value">{rupiah(revenue)}</div>
          <div className="sub">{sales.length} transaksi</div>
        </div>
        <div className="card stat">
          <div className="label">Rata-rata / transaksi</div>
          <div className="value">{rupiah(sales.length === 0 ? 0 : Math.round(revenue / sales.length))}</div>
          <div className="sub">Diskon {rupiah(sales.reduce((sum, sale) => sum + sale.discount, 0))}</div>
        </div>
        <div className="card stat">
          <div className="label">Estimasi laba kotor</div>
          <div className="value" style={{ color: "var(--brand)" }}>{rupiah(revenue - cost)}</div>
          <div className="sub">Setelah modal barang terjual</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Penjualan harian</h2>
          {sales.length === 0 ? (
            <p className="empty">Tidak ada transaksi pada rentang ini.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Tanggal</th><th className="num">Transaksi</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date}>
                    <td>
                      <div className="small">{row.date}</div>
                      <div style={{ height: 5, background: "var(--line)", borderRadius: 999, marginTop: 5 }}>
                        <div
                          style={{
                            height: 5,
                            width: `${Math.max(2, Math.round((row.total / maxDaily) * 100))}%`,
                            background: "var(--brand)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </td>
                    <td className="num muted">{row.count}</td>
                    <td className="num">{rupiah(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 style={{ fontSize: 18 }}>Produk terlaris</h2>
          {bestSellers.length === 0 ? (
            <p className="empty">Belum ada penjualan.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Produk</th><th className="num">Qty</th><th className="num">Omzet</th><th className="num">Laba</th></tr>
              </thead>
              <tbody>
                {bestSellers.map((product) => (
                  <tr key={product.name}>
                    <td>{product.name}</td>
                    <td className="num">{product.qty}</td>
                    <td className="num">{rupiah(product.revenue)}</td>
                    <td className="num" style={{ color: "var(--ok)" }}>{rupiah(product.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ fontSize: 18, marginTop: 24 }}>Stok menipis</h2>
          {lowStock.length === 0 ? (
            <p className="empty">Semua stok aman.</p>
          ) : (
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              {lowStock.slice(0, 6).map((product) => (
                <li key={product.name}>
                  {product.name} — <strong>{product.stock}</strong> / min. {product.minStock}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
