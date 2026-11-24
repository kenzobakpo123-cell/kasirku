import { NextRequest } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { parseRange, toCsv } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const params = req.nextUrl.searchParams;
  const range = parseRange(params.get("from"), params.get("to"));
  const type = params.get("type") === "products" ? "products" : "sales";

  let csv: string;
  let filename: string;

  if (type === "products") {
    const products = await db.product.findMany({
      where: { tenantId: auth.ctx.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { name: true, sku: true, price: true, cost: true, stock: true, minStock: true },
    });
    csv = toCsv(
      ["Nama", "SKU", "Harga", "Modal", "Stok", "Stok Minimum"],
      products.map((product) => [
        product.name,
        product.sku ?? "",
        product.price,
        product.cost,
        product.stock,
        product.minStock,
      ]),
    );
    filename = `produk-${range.fromKey}-${range.toKey}.csv`;
  } else {
    const sales = await db.sale.findMany({
      where: { tenantId: auth.ctx.tenantId, createdAt: { gte: range.from, lte: range.to } },
      orderBy: { createdAt: "desc" },
      select: {
        number: true,
        createdAt: true,
        method: true,
        subtotal: true,
        discount: true,
        total: true,
        paid: true,
      },
    });
    csv = toCsv(
      ["No. Transaksi", "Waktu", "Metode", "Subtotal", "Diskon", "Total", "Dibayar"],
      sales.map((sale) => [
        sale.number,
        sale.createdAt.toISOString(),
        sale.method,
        sale.subtotal,
        sale.discount,
        sale.total,
        sale.paid,
      ]),
    );
    filename = `penjualan-${range.fromKey}-${range.toKey}.csv`;
  }

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
