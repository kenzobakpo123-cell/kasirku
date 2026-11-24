import { describe, expect, it } from "vitest";
import { deviceLabel, rateLimit, resetRateLimit } from "@/lib/security";

describe("rateLimit", () => {
  it("mengizinkan sampai batas lalu menolak", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("bisa di-reset setelah login berhasil", () => {
    const key = `test-reset-${Math.random()}`;
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 1, 60_000).allowed).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true);
  });
});

describe("deviceLabel", () => {
  it("menghasilkan label dari user agent", () => {
    const label = deviceLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36");
    expect(label).toContain("Chrome");
    expect(label).toContain("Windows");
  });

  it("punya fallback untuk user agent kosong", () => {
    expect(deviceLabel(null)).toBe("Perangkat tidak dikenal");
  });
});
