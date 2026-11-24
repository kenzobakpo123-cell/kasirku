import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { subscriptionPlan } from "@/lib/billing";
import { parseProductsCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { hasCapacity, PLAN_LIMITS } from "@/lib/plans";
import { forbidden, isSameOrigin } from "@/lib/security";
import { isDuplicateKeyError } from "@/lib/schemas";
import { canManage } from "@/lib/tenant";

const schema = z.object({ csv: z.string().min(1).max(2_000_000) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Hanya owner/manager yang bisa import produk." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "File CSV tidak valid" }, { status: 400 });

  const { products, errors } = parseProductsCsv(parsed.data.csv);
  if (errors.length > 0 || products.length === 0) {
    return NextResponse.json({ error: "CSV tidak bisa diproses.", details: errors }, { status: 400 });
  }

  const [plan, usedCount, existingSkus] = await Promise.all([
    subscriptionPlan(auth.ctx.tenantId),
    db.product.count({ where: { tenantId: auth.ctx.tenantId, active: true } }),
    db.product.findMany({
      where: { tenantId: auth.ctx.tenantId, sku: { not: null } },
      select: { sku: true },
      take: 10_000,
    }),
  ]);

  if (!hasCapacity(usedCount + products.length, PLAN_LIMITS[plan].products)) {
    return NextResponse.json(
      {
        error: `Import ${products.length} produk melebihi batas paket ${plan} (${PLAN_LIMITS[plan].products}). Upgrade ke Pro.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }

  const known = new Set(existingSkus.map((item) => item.sku!.toUpperCase()));
  const conflict = products.find((product) => product.sku && known.has(product.sku.toUpperCase()));
  if (conflict) {
    return NextResponse.json(
      { error: `SKU ${conflict.sku} sudah dipakai di toko ini.` },
      { status: 409 },
    );
  }

  try {
    const created = await db.$transaction(async (tx) => {
      let count = 0;
      for (const product of products) {
        const row = await tx.product.create({
          data: {
            tenantId: auth.ctx.tenantId,
            name: product.name,
            sku: product.sku ?? null,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            minStock: product.minStock,
          },
          select: { id: true },
        });
        if (product.stock > 0) {
          await tx.stockMovement.create({
            data: {
              tenantId: auth.ctx.tenantId,
              productId: row.id,
              delta: product.stock,
              type: "RESTOCK",
              note: "Import CSV",
              refId: `import:${row.id}:${randomBytes(4).toString("hex")}`,
            },
          });
        }
        count += 1;
      }
      return count;
    });

    void audit({
      action: "PRODUCT_IMPORT",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Product",
      req,
    });
    return NextResponse.json({ ok: true, imported: created });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Ada SKU yang bentrok dengan data toko." }, { status: 409 });
    }
    throw error;
  }
}
