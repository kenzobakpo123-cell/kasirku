import type { Role } from "@prisma/client";

export const ASSIGNABLE_ROLES = ["MANAGER", "CASHIER", "AGENCY"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function canAssign(actor: Role, target: AssignableRole): boolean {
  if (actor === "OWNER") return true;
  if (actor === "AGENCY") return target === "MANAGER" || target === "CASHIER";
  if (actor === "MANAGER") return target === "CASHIER";
  return false;
}

export function canRemove(actor: Role, target: Role, isSelf: boolean): boolean {
  if (isSelf || target === "OWNER") return false;
  if (actor === "OWNER") return true;
  if (actor === "AGENCY") return target === "MANAGER" || target === "CASHIER";
  if (actor === "MANAGER") return target === "CASHIER";
  return false;
}

export function roleLabel(role: Role): string {
  return {
    OWNER: "Pemilik",
    MANAGER: "Manager",
    CASHIER: "Kasir",
    AGENCY: "Agensi",
    ADMIN: "Admin",
  }[role];
}
