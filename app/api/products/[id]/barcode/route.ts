import { NextRequest } from "next/server";
import bwipjs from "bwip-js/node";
import { tenantContext } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "Produk tidak valid" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { id: productId, tenantId: auth.ctx.tenantId },
    select: { name: true, sku: true },
  });
  if (!product) return Response.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  if (!product.sku) return Response.json({ error: "Produk ini belum punya SKU" }, { status: 400 });

  const svg = bwipjs.toSVG({
    bcid: "code128",
    text: product.sku,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
    backgroundcolor: "FFFFFF",
    barcolor: "12201B",
  });

  const labelled = svg.replace(
    "<svg ",
    `<svg role="img" aria-label="Barcode ${product.sku} - ${product.name}" `,
  );

  return new Response(labelled, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="barcode-${product.sku}.svg"`,
    },
  });
}
