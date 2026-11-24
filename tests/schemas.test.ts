import { describe, expect, it } from "vitest";
import { loginSchema, productSchema, registerSchema, saleSchema } from "@/lib/schemas";

describe("schemas", () => {
  it("menolak email invalid dan password pendek saat daftar", () => {
    const result = registerSchema.safeParse({
      name: "Andi",
      tenantName: "Kedai Andi",
      email: "bukan-email",
      password: "pendek",
    });
    expect(result.success).toBe(false);
  });

  it("menerima data pendaftaran yang valid", () => {
    const result = registerSchema.safeParse({
      name: "Andi",
      tenantName: "Kedai Andi",
      email: "andi@example.com",
      password: "rahasia-kuat-123",
    });
    expect(result.success).toBe(true);
  });

  it("menolak harga produk nol atau negatif", () => {
    expect(productSchema.safeParse({ name: "Kopi", price: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ name: "Kopi", price: 18000 }).success).toBe(true);
  });

  it("menerima gambar produk berupa data URL dan menolak tautan biasa", () => {
    expect(
      productSchema.safeParse({
        name: "Kopi",
        price: 18000,
        imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      }).success,
    ).toBe(true);
    expect(
      productSchema.safeParse({ name: "Kopi", price: 18000, imageData: "https://contoh.com/a.jpg" }).success,
    ).toBe(false);
  });

  it("mewajibkan kontak pembeli sesuai kanal struk", () => {
    const base = { outletId: 1, items: [{ productId: 1, qty: 1 }], paid: 18000 };
    expect(saleSchema.safeParse({ ...base, receiptChannel: "WHATSAPP" }).success).toBe(false);
    expect(
      saleSchema.safeParse({ ...base, receiptChannel: "WHATSAPP", customerPhone: "08123456789" }).success,
    ).toBe(true);
    expect(saleSchema.safeParse({ ...base, receiptChannel: "EMAIL", customerEmail: "a@b.com" }).success).toBe(true);
  });

  it("mengisi default method CASH pada transaksi", () => {
    const result = saleSchema.safeParse({
      outletId: 1,
      items: [{ productId: 1, qty: 2 }],
      paid: 36000,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe("CASH");
  });

  it("menolak keranjang kosong", () => {
    expect(saleSchema.safeParse({ outletId: 1, items: [], paid: 0 }).success).toBe(false);
  });

  it("login menerima password apa pun sebagai string", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});
