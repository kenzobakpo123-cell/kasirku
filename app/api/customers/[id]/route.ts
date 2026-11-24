import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { customerUpdateSchema, isDuplicateKeyError } from "@/lib/schemas";
import { canManage, canUseCashier } from "@/lib/tenant";
import { forbidden, isSameOrigin } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function findCustomer(tenantId: number, id: number) {
  return db.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
}

export async function PATCH(req: NextRequest, context: Context) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canUseCashier(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Role ini tidak bisa mengubah member." }, { status: 403 });
  }

  const id = parseId((await context.params).id);
  if (!id) return NextResponse.json({ error: "Member tidak valid." }, { status: 400 });
  if (!(await findCustomer(auth.ctx.tenantId, id))) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  const parsed = customerUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data member tidak valid" }, { status: 400 });
  }

  try {
    const customer = await db.customer.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true },
    });

    void audit({
      action: "CUSTOMER_UPDATE",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Customer",
      entityId: id,
      req,
    });
    return NextResponse.json({ customer });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Email ini sudah dipakai member lain." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canManage(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Role ini tidak bisa menghapus member." }, { status: 403 });
  }

  const id = parseId((await context.params).id);
  if (!id) return NextResponse.json({ error: "Member tidak valid." }, { status: 400 });
  if (!(await findCustomer(auth.ctx.tenantId, id))) {
    return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
  }

  // Riwayat transaksi tetap disimpan; hanya tautan ke member yang dilepas.
  await db.$transaction([
    db.sale.updateMany({
      where: { tenantId: auth.ctx.tenantId, customerId: id },
      data: { customerId: null },
    }),
    db.customer.delete({ where: { id } }),
  ]);

  void audit({
    action: "CUSTOMER_REMOVE",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Customer",
    entityId: id,
    req,
  });
  return NextResponse.json({ ok: true });
}
