import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { receiptText } from "@/lib/receipt";
import { normalizePhone, sendWhatsApp } from "@/lib/whatsapp";

export type ReceiptDelivery = {
  skipped?: boolean;
  alreadySent?: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  whatsappUrl?: string;
  dev: boolean;
  errors: string[];
};

const empty: Omit<ReceiptDelivery, "skipped" | "alreadySent"> = {
  emailSent: false,
  whatsappSent: false,
  dev: false,
  errors: [],
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Gagal mengirim struk.";
}

/** Kirim struk dari server setelah transaksi tersimpan. Tidak pernah menggagalkan penjualan. */
export async function sendReceiptForSale(input: {
  saleId: number;
  tenantId: number;
  force?: boolean;
}): Promise<ReceiptDelivery> {
  const sale = await db.sale.findFirst({
    where: { id: input.saleId, tenantId: input.tenantId },
    include: {
      items: {
        orderBy: { id: "asc" },
        select: { nameSnapshot: true, qty: true, price: true },
      },
      tenant: { select: { name: true } },
      outlet: { select: { name: true } },
    },
  });

  if (!sale) return { ...empty, skipped: true, errors: ["Transaksi tidak ditemukan."] };
  if (sale.receiptChannel === "NONE") return { ...empty, skipped: true };
  if (sale.receiptSent && !input.force) return { ...empty, alreadySent: true };

  const phone = normalizePhone(sale.customerPhone);
  const text = receiptText({
    storeName: sale.tenant.name,
    outletName: sale.outlet.name,
    number: sale.number,
    customerName: sale.customerName,
    items: sale.items.map((item) => ({
      name: item.nameSnapshot,
      qty: item.qty,
      price: item.price,
      subtotal: item.price * item.qty,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    paid: sale.paid,
    change: sale.paid - sale.total,
    createdAt: sale.createdAt,
  });

  const delivery: ReceiptDelivery = { ...empty };
  const wantsEmail = sale.receiptChannel === "EMAIL" || sale.receiptChannel === "BOTH";
  const wantsWhatsApp = sale.receiptChannel === "WHATSAPP" || sale.receiptChannel === "BOTH";

  if (wantsEmail) {
    if (!sale.customerEmail) {
      delivery.errors.push("Email pembeli tidak tersedia.");
    } else {
      try {
        const result = await sendMail({
          to: sale.customerEmail,
          subject: `Struk ${sale.number} — ${sale.tenant.name}`,
          text,
        });
        delivery.emailSent = result.sent;
        if (!result.sent) delivery.dev = true;
      } catch (error) {
        delivery.errors.push(`Email: ${message(error)}`);
      }
    }
  }

  if (wantsWhatsApp) {
    if (!phone) {
      delivery.errors.push("Nomor WhatsApp pembeli tidak valid.");
    } else {
      try {
        const result = await sendWhatsApp({ to: phone, text });
        delivery.whatsappSent = result.sent;
        if (result.url) delivery.whatsappUrl = result.url;
        if (!result.sent) delivery.dev = true;
      } catch (error) {
        delivery.errors.push(`WhatsApp: ${message(error)}`);
      }
    }
  }

  try {
    await db.sale.update({
      where: { id: sale.id },
      data: {
        customerPhone: phone ?? sale.customerPhone,
        receiptSent: delivery.emailSent || delivery.whatsappSent,
        receiptError: delivery.errors.length ? delivery.errors.join(" · ").slice(0, 300) : null,
      },
    });
  } catch {
    // Status pengiriman hanya pelengkap; transaksi tetap dianggap berhasil.
  }

  return delivery;
}
