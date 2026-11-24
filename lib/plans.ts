import type { Plan } from "@prisma/client";

export type Limits = {
  outlets: number;
  products: number;
  salesPerMonth: number;
};

export const PLAN_LIMITS: Record<Plan, Limits> = {
  FREE: { outlets: 1, products: 3, salesPerMonth: 100 },
  PRO: { outlets: 10, products: 10_000, salesPerMonth: 100_000 },
  AGENCY: { outlets: 100, products: 100_000, salesPerMonth: 1_000_000 },
};

export const PAID_PLANS = {
  PRO: 199_000,
  AGENCY: 499_000,
} as const;

export type PaidPlan = keyof typeof PAID_PLANS;

export function isPaidPlan(value: string): value is PaidPlan {
  return value === "PRO" || value === "AGENCY";
}

/** PRO dikenakan per outlet; AGENCY flat untuk semua klien. */
export function priceFor(plan: PaidPlan, outletCount: number): number {
  return plan === "PRO" ? PAID_PLANS.PRO * Math.max(1, outletCount) : PAID_PLANS.AGENCY;
}

export function hasCapacity(used: number, limit: number): boolean {
  return used < limit;
}

/** Komisi dihitung dalam rupiah bulat dari basis poin (1500 bps = 15%). */
export function commissionFor(salesTotal: number, commissionBps: number): number {
  if (!Number.isFinite(salesTotal) || salesTotal <= 0) return 0;
  return Math.round((salesTotal * commissionBps) / 10_000);
}

export function startOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function nextBillingPeriod(from = new Date()): { start: Date; end: Date } {
  const start = new Date(from);
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + 30);
  return { start, end };
}
