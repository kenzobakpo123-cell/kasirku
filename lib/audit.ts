import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/security";

type AuditInput = {
  action: string;
  tenantId?: number | null;
  userId?: number | null;
  entity?: string;
  entityId?: number;
  req?: NextRequest;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action.slice(0, 80),
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        entity: input.entity?.slice(0, 80) ?? null,
        entityId: input.entityId ?? null,
        ip: input.req ? clientIp(input.req) : null,
      },
    });
  } catch (error) {
    console.error("Gagal menulis audit log:", error);
  }
}
