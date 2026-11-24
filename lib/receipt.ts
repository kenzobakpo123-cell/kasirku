import { dateTime, rupiah } from "@/lib/format";

export type ReceiptLine = {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type ReceiptTextInput = {
  storeName: string;
  outletName?: string | null;
  number: string;
  customerName?: string | null;
  customerEmail?: string | null;
  items: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  createdAt: Date;
};

export function receiptText(input: ReceiptTextInput): string {
  const lines = input.items.map((item) => `${item.qty}× ${item.name} — ${rupiah(item.subtotal)}`);
  const header = input.customerName ? `Halo ${input.customerName},\n\n` : "";

  return [
    header + `*STRUK ${input.storeName.toUpperCase()}*`,
    input.outletName ?? "",
    input.number,
    dateTime(input.createdAt),
    ...(input.customerEmail ? [`Dikirim ke: ${input.customerEmail}`] : []),
    "",
    ...lines,
    "",
    `Subtotal: ${rupiah(input.subtotal)}`,
    ...(input.discount > 0 ? [`Diskon: -${rupiah(input.discount)}`] : []),
    `Total: ${rupiah(input.total)}`,
    `Dibayar: ${rupiah(input.paid)}`,
    `Kembalian: ${rupiah(input.change)}`,
    "",
    "Terima kasih sudah belanja. Simpan struk ini sebagai bukti pembelian.",
  ]
    .filter((line, index) => line !== "" || index > 4)
    .join("\n");
}
