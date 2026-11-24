import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { Plan, Role } from "@prisma/client";
import { TENANT_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

export type MembershipInfo = {
  tenantId: number;
  role: Role;
  tenant: { id: number; name: string; slug: string; plan: Plan };
};

export async function listMemberships(userId: number): Promise<MembershipInfo[]> {
  return db.membership.findMany({
    where: { userId },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { id: true, name: true, slug: true, plan: true } },
    },
    orderBy: { tenant: { name: "asc" } },
  });
}

export async function membershipFor(userId: number, tenantId: number): Promise<MembershipInfo | null> {
  return db.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: {
      tenantId: true,
      role: true,
      tenant: { select: { id: true, name: true, slug: true, plan: true } },
    },
  });
}

export function canManage(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "AGENCY";
}

export function canUseCashier(role: Role): boolean {
  return role === "OWNER" || role === "MANAGER" || role === "CASHIER" || role === "AGENCY";
}

function parseTenantId(value: string | undefined | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Tenant aktif untuk Server Component (cookie). */
export async function activeTenantId(): Promise<number | null> {
  const store = await cookies();
  return parseTenantId(store.get(TENANT_COOKIE)?.value);
}

/** Tenant aktif untuk Route Handler (header `x-tenant-id` atau cookie). */
export function tenantFromRequest(req: NextRequest): number | null {
  return parseTenantId(req.headers.get("x-tenant-id") ?? req.cookies.get(TENANT_COOKIE)?.value);
}
