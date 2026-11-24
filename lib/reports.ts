export type DateRange = { from: Date; to: Date; fromKey: string; toKey: string };

export type DailyRow = { date: string; total: number; count: number };
export type TopProductRow = { name: string; qty: number; revenue: number; profit: number };

const DAY = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value: string | undefined | null): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

/** Rentang default: 30 hari terakhir, inklusif, berbasis UTC. */
export function parseRange(from?: string | string[] | null, to?: string | string[] | null): DateRange {
  const first = typeof from === "string" ? validDateKey(from) : null;
  const last = typeof to === "string" ? validDateKey(to) : null;
  const toKey = last ?? new Date().toISOString().slice(0, 10);
  const toDate = new Date(`${toKey}T00:00:00.000Z`);
  const fromDate = first
    ? new Date(`${first}T00:00:00.000Z`)
    : new Date(toDate.getTime() - 29 * DAY);
  const fromKey = fromDate.toISOString().slice(0, 10);
  return {
    from: fromDate,
    to: new Date(toDate.getTime() + DAY - 1),
    fromKey,
    toKey,
  };
}

export function groupDaily(
  sales: Array<{ createdAt: Date; total: number }>,
  range: DateRange,
): DailyRow[] {
  const buckets = new Map<string, DailyRow>();
  const days = Math.max(0, Math.round((range.to.getTime() + 1 - range.from.getTime()) / DAY));
  for (let index = 0; index < days; index += 1) {
    const date = new Date(range.from.getTime() + index * DAY).toISOString().slice(0, 10);
    buckets.set(date, { date, total: 0, count: 0 });
  }
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (!row) continue;
    row.total += sale.total;
    row.count += 1;
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function topProducts(
  items: Array<{ nameSnapshot: string; qty: number; price: number; cost: number }>,
  limit = 10,
): TopProductRow[] {
  const byName = new Map<string, TopProductRow>();
  for (const item of items) {
    const row = byName.get(item.nameSnapshot) ?? {
      name: item.nameSnapshot,
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    row.qty += item.qty;
    row.revenue += item.price * item.qty;
    row.profit += (item.price - item.cost) * item.qty;
    byName.set(item.nameSnapshot, row);
  }
  return [...byName.values()]
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Escape CSV + cegah spreadsheet formula injection dari data toko. */
export function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
