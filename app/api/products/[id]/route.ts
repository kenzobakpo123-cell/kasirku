import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";
import { isDuplicateKeyError, productSchema } from "@/lib/schemas";
import { canManage } from "@/lib/tenant";

type Context = { params: Promise<{ id: string }> };

const patchSchema = productSchema.partial();

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, context: Context) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa mengubah produk." }, { status: 403 });
  }

  const id = parseId((await context.params).id);
  if (!id) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const product = await db.$transaction(async (tx) => {
      const current = await tx.product.findFirst({
        where: { id, tenantId: auth.ctx.tenantId },
        select: { stock: true },
      });
      if (!current) return null;

      const updated = await tx.product.updateMany({
        where: { id, tenantId: auth.ctx.tenantId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.sku !== undefined ? { sku: data.sku || null } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.cost !== undefined ? { cost: data.cost } : {}),
          ...(data.stock !== undefined ? { stock: data.stock } : {}),
          ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
          ...(data.outletId !== undefined ? { outletId: data.outletId ?? null } : {}),
        },
      });
      if (updated.count !== 1) return null;

      if (data.stock !== undefined && data.stock !== current.stock) {
        await tx.stockMovement.create({
          data: {
            tenantId: auth.ctx.tenantId,
            productId: id,
            delta: data.stock - current.stock,
            type: "ADJUST",
            note: "Penyesuaian manual",
            refId: `adjust:${id}:${randomBytes(4).toString("hex")}`,
          },
        });
      }

      return tx.product.findFirst({
        where: { id, tenantId: auth.ctx.tenantId },
        select: { id: true, name: true, price: true, stock: true },
      });
    });

    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    void audit({
      action: "PRODUCT_UPDATE",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Product",
      entityId: id,
      req,
    });
    return NextResponse.json({ product });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "SKU sudah dipakai di toko ini." }, { status: 409 });
    }
    throw error;
  }
}

/** Soft delete: produk tidak benar-benar hilang karena dipakai riwayat penjualan. */
export async function DELETE(req: NextRequest, context: Context) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa menghapus produk." }, { status: 403 });
  }

  const id = parseId((await context.params).id);
  if (!id) return NextResponse.json({ error: "ID produk tidak valid." }, { status: 400 });

  const updated = await db.product.updateMany({
    where: { id, tenantId: auth.ctx.tenantId, active: true },
    data: { active: false },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  void audit({
    action: "PRODUCT_DEACTIVATE",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Product",
    entityId: id,
    req,
  });
  return NextResponse.json({ ok: true });
}

