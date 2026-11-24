import { describe, expect, it } from "vitest";
import {
  PAID_PLANS,
  PLAN_LIMITS,
  commissionFor,
  endOfMonth,
  hasCapacity,
  isPaidPlan,
  nextBillingPeriod,
  startOfMonth,
} from "@/lib/plans";

describe("PLAN_LIMITS", () => {
  it("FREE lebih ketat dari PRO dan AGENCY", () => {
    expect(PLAN_LIMITS.FREE.products).toBeLessThan(PLAN_LIMITS.PRO.products);
    expect(PLAN_LIMITS.PRO.salesPerMonth).toBeLessThan(PLAN_LIMITS.AGENCY.salesPerMonth);
  });

  it("hasCapacity menolak saat batas tercapai", () => {
    expect(hasCapacity(2, PLAN_LIMITS.FREE.products)).toBe(true);
    expect(hasCapacity(3, PLAN_LIMITS.FREE.products)).toBe(false);
  });

  it("isPaidPlan hanya menerima PRO/AGENCY", () => {
    expect(isPaidPlan("PRO")).toBe(true);
    expect(isPaidPlan("AGENCY")).toBe(true);
    expect(isPaidPlan("FREE")).toBe(false);
    expect(PAID_PLANS.PRO).toBe(199_000);
  });
});

describe("commissionFor", () => {
  it("15% dari 1.000.000 = 150.000", () => {
    expect(commissionFor(1_000_000, 1500)).toBe(150_000);
  });

  it("membulatkan ke rupiah terdekat", () => {
    expect(commissionFor(999, 1500)).toBe(150);
  });

  it("nol untuk total non-positif", () => {
    expect(commissionFor(0, 1500)).toBe(0);
    expect(commissionFor(-100, 1500)).toBe(0);
  });
});

describe("periode", () => {
  it("awal dan akhir bulan konsisten UTC", () => {
    const date = new Date("2026-11-24T10:00:00Z");
    expect(startOfMonth(date).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(endOfMonth(date).toISOString()).toBe("2026-11-30T23:59:59.999Z");
  });

  it("periode billing berikutnya 30 hari", () => {
    const { start, end } = nextBillingPeriod(new Date("2026-11-01T00:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
