import { productSchema } from "@/lib/schemas";

export type ParsedProduct = {
  name: string;
  sku?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
};

/** Parser CSV kecil: quote ganda, koma di dalam quote, CRLF/LF, dan BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

const ALIASES: Record<keyof ParsedProduct, string[]> = {
  name: ["nama", "name", "produk", "product"],
  sku: ["sku", "kode", "barcode"],
  price: ["harga", "price", "harga jual"],
  cost: ["modal", "cost", "harga modal"],
  stock: ["stok", "stock", "stok awal"],
  minStock: ["stok minimum", "minstok", "min stock", "minimum"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function columnMap(header: string[]): Partial<Record<keyof ParsedProduct, number>> {
  const map: Partial<Record<keyof ParsedProduct, number>> = {};
  header.forEach((raw, index) => {
    const key = normalize(raw);
    for (const [field, aliases] of Object.entries(ALIASES) as Array<[keyof ParsedProduct, string[]]>) {
      if (aliases.some((alias) => normalize(alias) === key) && map[field] === undefined) {
        map[field] = index;
      }
    }
  });
  return map;
}

function integer(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === "") return fallback;
  return Number(value.replace(/\./g, "").replace(/,/g, "").trim());
}

export function parseProductsCsv(
  input: string,
): { products: ParsedProduct[]; errors: string[] } {
  const rows = parseCsv(input);
  const errors: string[] = [];
  if (rows.length === 0) return { products: [], errors: ["File CSV kosong."] };

  const map = columnMap(rows[0]);
  if (map.name === undefined || map.price === undefined) {
    return {
      products: [],
      errors: ["Header wajib ada: Nama dan Harga. Kolom opsional: SKU, Modal, Stok, Stok Minimum."],
    };
  }
  if (rows.length > 501) {
    return { products: [], errors: ["Maksimal 500 produk per import."] };
  }

  const products: ParsedProduct[] = [];
  const seen = new Set<string>();

  rows.slice(1).forEach((cells, offset) => {
    const line = offset + 2;
    const name = cells[map.name!]?.trim() ?? "";
    const skuRaw = map.sku === undefined ? "" : cells[map.sku]?.trim() ?? "";
    const candidate = {
      name,
      sku: skuRaw || undefined,
      price: integer(cells[map.price!], Number.NaN),
      cost: integer(map.cost === undefined ? undefined : cells[map.cost], 0),
      stock: integer(map.stock === undefined ? undefined : cells[map.stock], 0),
      minStock: integer(map.minStock === undefined ? undefined : cells[map.minStock], 0),
    };
    const parsed = productSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push(`Baris ${line}: ${parsed.error.issues[0]?.message ?? "data tidak valid"}`);
      return;
    }
    if (candidate.sku) {
      const key = candidate.sku.toUpperCase();
      if (seen.has(key)) {
        errors.push(`Baris ${line}: SKU ${candidate.sku} duplikat dalam file.`);
        return;
      }
      seen.add(key);
    }
    products.push(parsed.data);
  });

  return { products, errors };
}
