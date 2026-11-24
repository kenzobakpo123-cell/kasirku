import { describe, expect, it } from "vitest";
import {
  customerSchema,
  customerUpdateSchema,
  loginSchema,
  productSchema,
  registerSchema,
  saleSchema,
} from "@/lib/schemas";

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

  it("mewajibkan email pembeli untuk struk dan member", () => {
    const base = {
      outletId: 1,
      items: [{ productId: 1, qty: 1 }],
      paid: 18000,
      customerName: "Nadia",
    };
    expect(saleSchema.safeParse(base).success).toBe(false);
    expect(saleSchema.safeParse({ ...base, customerEmail: "bukan-email" }).success).toBe(false);

    const valid = saleSchema.safeParse({ ...base, customerEmail: "Nadia@Example.com" });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.customerEmail).toBe("nadia@example.com");

    const withPhone = saleSchema.safeParse({ ...base, customerEmail: "nadia@example.com", customerPhone: "08123" });
    expect(withPhone.success).toBe(true);
    if (withPhone.success) {
      expect(withPhone.data).not.toHaveProperty("customerPhone");
      expect(withPhone.data.receiptChannel).toBe("EMAIL");
    }
    expect(saleSchema.safeParse({ ...base, customerEmail: "nadia@example.com", receiptChannel: "NONE" }).success).toBe(
      false,
    );
  });

  it("menerima member dengan nama dan menormalkan email", () => {
    expect(customerSchema.safeParse({ name: "", email: "nadia@example.com" }).success).toBe(false);
    const result = customerSchema.safeParse({
      name: "Nadia",
      email: "Nadia@Example.com",
      note: "Langganan kopi",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("nadia@example.com");
  });

  it("menolak pembaruan member tanpa field", () => {
    expect(customerUpdateSchema.safeParse({}).success).toBe(false);
    expect(customerUpdateSchema.safeParse({ note: "Catatan baru" }).success).toBe(true);
  });

  it("mengisi default method CASH pada transaksi", () => {
    const result = saleSchema.safeParse({
      outletId: 1,
      items: [{ productId: 1, qty: 2 }],
      paid: 36000,
      customerName: "Nadia",
      customerEmail: "nadia@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe("CASH");
  });

  it("menolak keranjang kosong", () => {
    expect(
      saleSchema.safeParse({
        outletId: 1,
        items: [],
        paid: 0,
        customerName: "Nadia",
        customerEmail: "nadia@example.com",
      }).success,
    ).toBe(false);
  });

  it("login menerima password apa pun sebagai string", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});
