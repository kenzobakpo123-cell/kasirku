import { describe, expect, it } from "vitest";
import { computeTotals, totalsAreValid } from "@/lib/sale";

describe("computeTotals", () => {
  it("menjumlahkan harga dikali jumlah", () => {
    expect(computeTotals([{ price: 18000, qty: 2 }, { price: 5000, qty: 1 }], 3000)).toEqual({
      subtotal: 41000,
      total: 38000,
      change: 0,
    });
  });

  it("totalsAreValid menolak diskon berlebih dan pembayaran kurang", () => {
    expect(totalsAreValid(-1000, 0)).toBe(false);
    expect(totalsAreValid(38000, 37000)).toBe(false);
    expect(totalsAreValid(38000, 40000)).toBe(true);
  });
});
