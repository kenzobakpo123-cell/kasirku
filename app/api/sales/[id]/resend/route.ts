import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { forbidden, isSameOrigin } from "@/lib/security";
import { sendReceiptForSale } from "@/lib/receipt-delivery";
import { canUseCashier } from "@/lib/tenant";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Context) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canUseCashier(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Role ini tidak bisa mengirim struk." }, { status: 403 });
  }

  const raw = (await context.params).id;
  const saleId = /^\d+$/.test(raw) ? Number(raw) : 0;
  if (!Number.isSafeInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
  }

  const delivery = await sendReceiptForSale({ saleId, tenantId: auth.ctx.tenantId, force: true });
  if (delivery.skipped) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan atau tidak punya pengiriman struk." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, receiptDelivery: delivery });
}
