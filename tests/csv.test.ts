import { describe, expect, it } from "vitest";
import { parseCsv, parseProductsCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("menangani koma di dalam quote dan CRLF", () => {
    expect(parseCsv('Nama,Harga\r\n"Kopi, Latte",18000\r\n')).toEqual([
      ["Nama", "Harga"],
      ["Kopi, Latte", "18000"],
    ]);
  });

  it("menangani quote ganda dan BOM", () => {
    expect(parseCsv('\uFEFFNama,Keterangan\n"Kopi ""Special""","Enak"\n')).toEqual([
      ["Nama", "Keterangan"],
      ['Kopi "Special"', "Enak"],
    ]);
  });

  it("mengabaikan baris kosong", () => {
    expect(parseCsv("A,B\n\n1,2\n")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});

describe("parseProductsCsv", () => {
  it("menerima header Indonesia dan angka bertitik", () => {
    const result = parseProductsCsv(
      "Nama,SKU,Harga,Modal,Stok,Stok Minimum\nKopi Latte,KL-1,22.000,8.000,30,10\n",
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0]).toMatchObject({ name: "Kopi Latte", sku: "KL-1", price: 22000, cost: 8000 });
  });

  it("menolak header tanpa harga", () => {
    expect(parseProductsCsv("Nama,Stok\nKopi,5\n").errors[0]).toContain("Harga");
  });

  it("melaporkan baris invalid dan duplikat SKU", () => {
    const result = parseProductsCsv(
      "Nama,SKU,Harga\nKopi,A,18000\nTeh,A,8000\nRusak,B,0\n",
    );
    expect(result.products).toHaveLength(1);
    expect(result.errors.some((error) => error.includes("Baris 3"))).toBe(true);
    expect(result.errors.some((error) => error.includes("Baris 4"))).toBe(true);
  });
});
