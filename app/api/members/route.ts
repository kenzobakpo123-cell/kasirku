import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ASSIGNABLE_ROLES, canAssign, canRemove } from "@/lib/members";
import { forbidden, isSameOrigin } from "@/lib/security";

const inviteSchema = z.object({
  email: z.email().max(120).transform((value) => value.toLowerCase()),
  role: z.enum(ASSIGNABLE_ROLES),
});

const removeSchema = z.object({ userId: z.number().int().positive() });

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const tenant = await db.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { ownerId: true },
  });
  const members = await db.membership.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ members, ownerId: tenant?.ownerId ?? null });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data undangan tidak valid" }, { status: 400 });
  if (!canAssign(auth.ctx.membership.role, parsed.data.role)) {
    return NextResponse.json({ error: "Role ini tidak boleh kamu berikan." }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Email ini belum punya akun Kasirku. Minta orang tersebut mendaftar dulu." },
      { status: 404 },
    );
  }
  if (user.id === auth.ctx.viewer.uid) {
    return NextResponse.json({ error: "Kamu sudah menjadi anggota toko ini." }, { status: 409 });
  }
  const existing = await db.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: auth.ctx.tenantId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Pengguna ini sudah menjadi anggota toko." }, { status: 409 });
  }

  const membership = await db.membership.create({
    data: { userId: user.id, tenantId: auth.ctx.tenantId, role: parsed.data.role },
    select: { userId: true, role: true },
  });

  void audit({
    action: "MEMBER_ADD",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Membership",
    entityId: user.id,
    req,
  });
  return NextResponse.json({ membership, name: user.name }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const parsed = removeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const target = await db.membership.findUnique({
    where: { userId_tenantId: { userId: parsed.data.userId, tenantId: auth.ctx.tenantId } },
    select: { userId: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
  if (!canRemove(auth.ctx.membership.role, target.role, target.userId === auth.ctx.viewer.uid)) {
    return NextResponse.json({ error: "Kamu tidak bisa menghapus anggota ini." }, { status: 403 });
  }

  await db.membership.delete({
    where: { userId_tenantId: { userId: target.userId, tenantId: auth.ctx.tenantId } },
  });

  void audit({
    action: "MEMBER_REMOVE",
    tenantId: auth.ctx.tenantId,
    userId: auth.ctx.viewer.uid,
    entity: "Membership",
    entityId: target.userId,
    req,
  });
  return NextResponse.json({ ok: true });
}
