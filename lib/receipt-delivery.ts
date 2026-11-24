import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { receiptText } from "@/lib/receipt";

export type ReceiptDelivery = {
  skipped?: boolean;
  alreadySent?: boolean;
  emailSent: boolean;
  dev: boolean;
  errors: string[];
};

const empty: Omit<ReceiptDelivery, "skipped" | "alreadySent"> = {
  emailSent: false,
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

  const text = receiptText({
    storeName: sale.tenant.name,
    outletName: sale.outlet.name,
    number: sale.number,
    customerName: sale.customerName,
    customerEmail: sale.customerEmail,
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

  try {
    await db.sale.update({
      where: { id: sale.id },
      data: {
        receiptSent: delivery.emailSent,
        receiptError: delivery.errors.length ? delivery.errors.join(" · ").slice(0, 300) : null,
      },
    });
  } catch {
    // Status pengiriman hanya pelengkap; transaksi tetap dianggap berhasil.
  }

  return delivery;
}
