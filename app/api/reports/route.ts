import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { groupDaily, parseRange, topProducts } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const params = req.nextUrl.searchParams;
  const range = parseRange(params.get("from"), params.get("to"));

  const [sales, products] = await Promise.all([
    db.sale.findMany({
      where: { tenantId: auth.ctx.tenantId, createdAt: { gte: range.from, lte: range.to } },
      select: {
        id: true,
        number: true,
        total: true,
        discount: true,
        createdAt: true,
        method: true,
        items: { select: { nameSnapshot: true, qty: true, price: true, cost: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.product.findMany({
      where: { tenantId: auth.ctx.tenantId, active: true },
      select: { id: true, name: true, sku: true, stock: true, minStock: true, price: true },
      orderBy: { stock: "asc" },
    }),
  ]);

  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const items = sales.flatMap((sale) => sale.items);
  const cost = items.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const discount = sales.reduce((sum, sale) => sum + sale.discount, 0);

  return NextResponse.json({
    range: { from: range.fromKey, to: range.toKey },
    summary: {
      revenue,
      transactions: sales.length,
      average: sales.length === 0 ? 0 : Math.round(revenue / sales.length),
      profit: revenue - cost,
      discount,
    },
    daily: groupDaily(sales, range),
    topProducts: topProducts(items),
    lowStock: products.filter((product) => product.stock <= product.minStock),
    recentSales: sales.slice(-10).reverse(),
  });
}
