import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { subscriptionPlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { hasCapacity, PLAN_LIMITS } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { isDuplicateKeyError, productSchema } from "@/lib/schemas";
import { canManage } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const products = await db.product.findMany({
    where: {
      tenantId: auth.ctx.tenantId,
      active: true,
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
    },
    orderBy: { name: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      cost: true,
      stock: true,
      minStock: true,
      outletId: true,
    },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa menambah produk." }, { status: 403 });
  }

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data produk tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const [plan, used] = await Promise.all([
    subscriptionPlan(auth.ctx.tenantId),
    db.product.count({ where: { tenantId: auth.ctx.tenantId, active: true } }),
  ]);
  if (!hasCapacity(used, PLAN_LIMITS[plan].products)) {
    return NextResponse.json(
      { error: `Paket ${plan} hanya mendukung ${PLAN_LIMITS[plan].products} produk. Upgrade ke Pro.`, upgrade: true },
      { status: 402 },
    );
  }

  if (data.outletId) {
    const outlet = await db.outlet.findFirst({
      where: { id: data.outletId, tenantId: auth.ctx.tenantId },
      select: { id: true },
    });
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 400 });
  }

  try {
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId: auth.ctx.tenantId,
          outletId: data.outletId ?? null,
          sku: data.sku || null,
          name: data.name,
          price: data.price,
          cost: data.cost,
          stock: data.stock,
          minStock: data.minStock,
        },
        select: { id: true, name: true, price: true, stock: true },
      });
      if (data.stock > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: auth.ctx.tenantId,
            productId: created.id,
            delta: data.stock,
            type: "RESTOCK",
            note: "Stok awal",
            refId: `initial:${created.id}:${randomBytes(4).toString("hex")}`,
          },
        });
      }
      return created;
    });

    void audit({
      action: "PRODUCT_CREATE",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Product",
      entityId: product.id,
      req,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "SKU sudah dipakai di toko ini." }, { status: 409 });
    }
    throw error;
  }
}
