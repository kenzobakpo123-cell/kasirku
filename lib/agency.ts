import { randomBytes } from "node:crypto";
import type { Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { commissionFor, startOfMonth } from "@/lib/plans";

export type AgencyTenantRow = {
  id: number;
  name: string;
  plan: Plan;
  sales: number;
  commission: number;
};

export type AgencySummary = {
  tenantCount: number;
  salesThisMonth: number;
  commissionThisMonth: number;
  conversions: number;
  tenants: AgencyTenantRow[];
};

export async function isAgency(userId: number): Promise<boolean> {
  return Boolean(
    await db.membership.findFirst({
      where: { userId, role: "AGENCY" },
      select: { id: true },
    }),
  );
}

export async function agencyTenantIds(userId: number): Promise<number[]> {
  const memberships = await db.membership.findMany({
    where: { userId, role: "AGENCY" },
    select: { tenantId: true },
  });
  return memberships.map((membership) => membership.tenantId);
}

export async function getAgencySummary(userId: number): Promise<AgencySummary> {
  const tenantIds = await agencyTenantIds(userId);
  if (tenantIds.length === 0) {
    return { tenantCount: 0, salesThisMonth: 0, commissionThisMonth: 0, conversions: 0, tenants: [] };
  }

  const [tenants, sales, referrals] = await Promise.all([
    db.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, plan: true } }),
    db.sale.findMany({
      where: { tenantId: { in: tenantIds }, createdAt: { gte: startOfMonth() } },
      select: { tenantId: true, total: true },
    }),
    db.referral.findMany({
      where: { agencyId: userId },
      select: { tenantId: true, commissionBps: true },
    }),
  ]);

  const bpsByTenant = new Map(referrals.map((referral) => [referral.tenantId, referral.commissionBps]));
  const salesByTenant = new Map<number, number>();
  for (const sale of sales) {
    salesByTenant.set(sale.tenantId, (salesByTenant.get(sale.tenantId) ?? 0) + sale.total);
  }

  const rows: AgencyTenantRow[] = tenants.map((tenant) => {
    const amount = salesByTenant.get(tenant.id) ?? 0;
    return {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      sales: amount,
      commission: commissionFor(amount, bpsByTenant.get(tenant.id) ?? 1500),
    };
  });

  return {
    tenantCount: rows.length,
    salesThisMonth: rows.reduce((sum, row) => sum + row.sales, 0),
    commissionThisMonth: rows.reduce((sum, row) => sum + row.commission, 0),
    conversions: referrals.length,
    tenants: rows.sort((a, b) => b.sales - a.sales),
  };
}

export async function listReferralCodes(userId: number) {
  return db.referralCode.findMany({
    where: { agencyId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      commissionBps: true,
      active: true,
      createdAt: true,
      _count: { select: { referrals: true } },
    },
  });
}

export async function createReferralCode(userId: number, commissionBps: number) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(5).toString("hex").toUpperCase();
    try {
      return await db.referralCode.create({
        data: { agencyId: userId, code, commissionBps },
        select: { id: true, code: true, commissionBps: true },
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Gagal membuat kode referral unik. Coba lagi.");
}
