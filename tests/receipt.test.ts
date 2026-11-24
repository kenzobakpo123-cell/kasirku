import { describe, expect, it } from "vitest";
import { receiptText } from "@/lib/receipt";

describe("struk pembeli", () => {
  it("memuat identitas toko, email, item, dan ringkasan pembayaran", () => {
    const text = receiptText({
      storeName: "Kopi Senja",
      outletName: "Kasir Utama",
      number: "INV-20261124-ABC123",
      customerName: "Nadia",
      customerEmail: "nadia@example.com",
      items: [{ name: "Kopi Americano", qty: 2, price: 18000, subtotal: 36000 }],
      subtotal: 36000,
      discount: 2000,
      total: 34000,
      paid: 40000,
      change: 6000,
      createdAt: new Date("2026-11-24T10:30:00.000Z"),
    });

    const normalized = text.replace(/\u00a0/g, " ");
    expect(normalized).toContain("Nadia");
    expect(normalized).toContain("Dikirim ke: nadia@example.com");
    expect(normalized).toContain("KOPI SENJA");
    expect(normalized).toContain("INV-20261124-ABC123");
    expect(normalized).toContain("2× Kopi Americano");
    expect(normalized).toContain("Diskon: -Rp 2.000");
    expect(normalized).toContain("Kembalian: Rp 6.000");
  });

  it("tidak menulis baris email saat tidak ada email pembeli", () => {
    const text = receiptText({
      storeName: "Kopi Senja",
      number: "INV-20261124-ABC124",
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      paid: 0,
      change: 0,
      createdAt: new Date("2026-11-24T10:30:00.000Z"),
    });
    expect(text).not.toContain("Dikirim ke:");
  });
});
