import { beforeEach, describe, expect, it } from "vitest";
import { dequeueSale, enqueueSale, loadQueue, OFFLINE_QUEUE_KEY } from "@/lib/offline-queue";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: new MemoryStorage() },
    configurable: true,
  });
});

describe("offline queue", () => {
  it("menyimpan dan membaca antrean", () => {
    enqueueSale({ key: "a", body: { total: 1000 }, createdAt: 1 });
    expect(loadQueue()).toHaveLength(1);
    expect(loadQueue()[0].key).toBe("a");
  });

  it("mengganti entri dengan kunci yang sama (idempoten)", () => {
    enqueueSale({ key: "a", body: { total: 1000 }, createdAt: 1 });
    enqueueSale({ key: "a", body: { total: 2000 }, createdAt: 2 });
    const items = loadQueue();
    expect(items).toHaveLength(1);
    expect(items[0].body.total).toBe(2000);
  });

  it("menghapus entri setelah sinkron", () => {
    enqueueSale({ key: "a", body: {}, createdAt: 1 });
    enqueueSale({ key: "b", body: {}, createdAt: 2 });
    expect(dequeueSale("a").map((item) => item.key)).toEqual(["b"]);
  });

  it("mengabaikan data rusak di localStorage", () => {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, "{bukan-json");
    expect(loadQueue()).toEqual([]);
  });
});
