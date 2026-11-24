import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { subscriptionPlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { hasCapacity, PLAN_LIMITS, startOfMonth } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { computeTotals, totalsAreValid } from "@/lib/sale";
import { isDuplicateKeyError, saleSchema } from "@/lib/schemas";
import { canUseCashier } from "@/lib/tenant";

class SaleError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const rupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

/**
 * Transaksi penjualan. Harga diambil dari database, bukan dari browser.
 * `updateMany` bersyarat (stock >= qty) mencegah stok minus saat dua kasir
 * menekan "Bayar" bersamaan.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canUseCashier(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Role ini tidak bisa melakukan penjualan." }, { status: 403 });
  }

  const parsed = saleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data transaksi tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const [plan, monthlySales] = await Promise.all([
    subscriptionPlan(auth.ctx.tenantId),
    db.sale.count({ where: { tenantId: auth.ctx.tenantId, createdAt: { gte: startOfMonth() } } }),
  ]);
  if (!hasCapacity(monthlySales, PLAN_LIMITS[plan].salesPerMonth)) {
    return NextResponse.json(
      {
        error: `Paket ${plan} hanya mendukung ${PLAN_LIMITS[plan].salesPerMonth} transaksi per bulan. Upgrade ke Pro.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }

  if (data.idempotencyKey) {
    const existing = await db.sale.findFirst({
      where: { tenantId: auth.ctx.tenantId, idempotencyKey: data.idempotencyKey },
      select: { id: true, number: true, total: true },
    });
    if (existing) return NextResponse.json({ ok: true, sale: existing, replay: true });
  }

  const outlet = await db.outlet.findFirst({
    where: { id: data.outletId, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 400 });

  try {
    const sale = await db.$transaction(async (tx) => {
      const ids = [...new Set(data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: ids }, tenantId: auth.ctx.tenantId, active: true },
        select: { id: true, name: true, price: true, cost: true },
      });
      if (products.length !== ids.length) {
        throw new SaleError("Ada produk yang tidak ditemukan atau sudah nonaktif.", 400);
      }
      const byId = new Map(products.map((product) => [product.id, product]));

      const snapshots: Array<{
        productId: number;
        nameSnapshot: string;
        qty: number;
        price: number;
        cost: number;
      }> = [];

      for (const item of data.items) {
        const product = byId.get(item.productId)!;
        const reserved = await tx.product.updateMany({
          where: {
            id: product.id,
            tenantId: auth.ctx.tenantId,
            active: true,
            stock: { gte: item.qty },
          },
          data: { stock: { decrement: item.qty } },
        });
        if (reserved.count !== 1) {
          throw new SaleError(`Stok ${product.name} tidak cukup.`, 409);
        }
        snapshots.push({
          productId: product.id,
          nameSnapshot: product.name,
          qty: item.qty,
          price: product.price,
          cost: product.cost,
        });
      }

      const { subtotal, total } = computeTotals(
        snapshots.map((item) => ({ price: item.price, qty: item.qty })),
        data.discount,
      );
      if (!totalsAreValid(total, data.paid)) {
        if (total < 0) throw new SaleError("Diskon tidak boleh melebihi subtotal.", 400);
        throw new SaleError(`Pembayaran kurang ${rupiah(total - data.paid)}.`, 400);
      }

      const number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;

      const created = await tx.sale.create({
        data: {
          tenantId: auth.ctx.tenantId,
          outletId: data.outletId,
          cashierId: auth.ctx.viewer.uid,
          number,
          subtotal,
          discount: data.discount,
          total,
          paid: data.paid,
          method: data.method,
          note: data.note ?? null,
          idempotencyKey: data.idempotencyKey ?? null,
          items: { create: snapshots },
        },
        select: { id: true, number: true, total: true, paid: true },
      });

      for (const item of snapshots) {
        await tx.stockMovement.create({
          data: {
            tenantId: auth.ctx.tenantId,
            productId: item.productId,
            delta: -item.qty,
            type: "SALE",
            note: `Penjualan ${created.number}`,
            refId: `sale:${created.id}:${item.productId}`,
          },
        });
      }

      return { ...created, change: data.paid - total };
    });

    void audit({
      action: "SALE_CREATE",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Sale",
      entityId: sale.id,
      req,
    });
    return NextResponse.json({ ok: true, sale }, { status: 201 });
  } catch (error) {
    if (error instanceof SaleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isDuplicateKeyError(error) && data.idempotencyKey) {
      const existing = await db.sale.findFirst({
        where: { tenantId: auth.ctx.tenantId, idempotencyKey: data.idempotencyKey },
        select: { id: true, number: true, total: true },
      });
      if (existing) return NextResponse.json({ ok: true, sale: existing, replay: true });
    }
    throw error;
  }
}
