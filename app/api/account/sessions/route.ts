import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";

const schema = z.object({ sessionId: z.number().int().positive() });

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const sessions = await db.session.findMany({
    where: { userId: viewer.uid, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, label: true, ip: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
  return NextResponse.json({ sessions, currentId: viewer.sid });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  if (parsed.data.sessionId === viewer.sid) {
    return NextResponse.json({ error: "Gunakan tombol Keluar untuk sesi ini." }, { status: 400 });
  }

  const updated = await db.session.updateMany({
    where: { id: parsed.data.sessionId, userId: viewer.uid, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });

  void audit({
    action: "SESSION_REVOKE",
    userId: viewer.uid,
    entity: "Session",
    entityId: parsed.data.sessionId,
    req,
  });
  return NextResponse.json({ ok: true });
}
