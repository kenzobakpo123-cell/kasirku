import { describe, expect, it } from "vitest";
import { receiptText } from "@/lib/receipt";
import { normalizePhone, waLink } from "@/lib/whatsapp";

describe("struk pembeli", () => {
  it("menormalkan nomor Indonesia ke format E.164", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
    expect(normalizePhone("abc")).toBeNull();
  });

  it("membuat tautan WhatsApp yang ditujukan ke pembeli", () => {
    expect(waLink("6281234567890", "Struk INV-1")).toBe(
      "https://wa.me/6281234567890?text=Struk%20INV-1",
    );
  });

  it("memuat identitas toko, item, dan ringkasan pembayaran", () => {
    const text = receiptText({
      storeName: "Kopi Senja",
      outletName: "Kasir Utama",
      number: "INV-20261124-ABC123",
      customerName: "Nadia",
      items: [{ name: "Kopi Americano", qty: 2, price: 18000, subtotal: 36000 }],
      subtotal: 36000,
      discount: 2000,
      total: 34000,
      paid: 40000,
      change: 6000,
      createdAt: new Date("2026-11-24T10:30:00.000Z"),
    });

    expect(text).toContain("Nadia");
    expect(text).toContain("KOPI SENJA");
    expect(text).toContain("INV-20261124-ABC123");
    expect(text).toContain("2× Kopi Americano");
    const normalized = text.replace(/\u00a0/g, " ");
    expect(normalized).toContain("Diskon: -Rp 2.000");
    expect(normalized).toContain("Kembalian: Rp 6.000");
  });
});
