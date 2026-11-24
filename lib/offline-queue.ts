export const OFFLINE_QUEUE_KEY = "kasirku:sale-queue";

export type QueuedSale = {
  key: string;
  body: Record<string, unknown>;
  createdAt: number;
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isQueuedSale(value: unknown): value is QueuedSale {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<QueuedSale>;
  return (
    typeof item.key === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.body === "object" &&
    item.body !== null
  );
}

export function loadQueue(): QueuedSale[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedSale) : [];
  } catch {
    return [];
  }
}

export function saveQueue(items: QueuedSale[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Penyimpanan penuh / mode privat: antrean tidak bisa dijamin, abaikan.
  }
}

/** IdempotencyKey yang sama dipakai ulang saat sinkron, jadi tidak ada double charge. */
export function enqueueSale(item: QueuedSale): QueuedSale[] {
  const items = loadQueue().filter((existing) => existing.key !== item.key);
  items.push(item);
  saveQueue(items);
  return items;
}

export function dequeueSale(key: string): QueuedSale[] {
  const items = loadQueue().filter((existing) => existing.key !== key);
  saveQueue(items);
  return items;
}
