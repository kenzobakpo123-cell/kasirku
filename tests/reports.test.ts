import { describe, expect, it } from "vitest";
import { csvCell, groupDaily, parseRange, toCsv, topProducts } from "@/lib/reports";

describe("parseRange", () => {
  it("memakai 30 hari terakhir bila tidak ada parameter", () => {
    const range = parseRange();
    expect(range.fromKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.toKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to.getTime()).toBeGreaterThanOrEqual(range.from.getTime());
  });

  it("menerima rentang eksplisit dan menolak format salah", () => {
    const range = parseRange("2026-11-01", "2026-11-30");
    expect(range.fromKey).toBe("2026-11-01");
    expect(range.toKey).toBe("2026-11-30");
    expect(parseRange("besok", undefined).fromKey).not.toBe("besok");
  });
});

describe("groupDaily", () => {
  it("mengisi hari kosong dengan nol dan menjumlahkan penjualan", () => {
    const range = parseRange("2026-11-01", "2026-11-03");
    const rows = groupDaily(
      [
        { createdAt: new Date("2026-11-01T08:00:00Z"), total: 10_000 },
        { createdAt: new Date("2026-11-01T15:00:00Z"), total: 5_000 },
      ],
      range,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ date: "2026-11-01", total: 15_000, count: 2 });
    expect(rows[1].total).toBe(0);
    expect(rows[2].count).toBe(0);
  });
});

describe("topProducts", () => {
  it("menggabungkan nama yang sama dan menghitung laba", () => {
    const rows = topProducts([
      { nameSnapshot: "Kopi", qty: 2, price: 18_000, cost: 6_000 },
      { nameSnapshot: "Kopi", qty: 1, price: 18_000, cost: 6_000 },
      { nameSnapshot: "Teh", qty: 1, price: 8_000, cost: 2_000 },
    ]);
    expect(rows[0]).toEqual({ name: "Kopi", qty: 3, revenue: 54_000, profit: 36_000 });
    expect(rows[1].name).toBe("Teh");
  });
});

describe("csv", () => {
  it("meng-escape koma, kutip, dan newline", () => {
    expect(csvCell('Kopi, "Latte"')).toBe('"Kopi, ""Latte"""');
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"');
  });

  it("mencegah formula injection tapi tidak mengubah angka negatif", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("\"'=SUM(A1:A9)\"");
    expect(csvCell(-5000)).toBe('"-5000"');
  });

  it("menghasilkan header dan baris dengan CRLF", () => {
    expect(toCsv(["A", "B"], [[1, "dua"]])).toBe('"A","B"\r\n"1","dua"');
  });
});
