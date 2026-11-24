import { NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_MAX_AGE, signAccessToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setAuthCookies, setTenantCookie } from "@/lib/cookies";
import { db } from "@/lib/db";
import { clientIp, deviceLabel } from "@/lib/security";
import { hashToken, newToken } from "@/lib/tokens";

type SessionUser = { id: number; name: string; tokenVersion: number };

/** Satu jalur pembuatan sesi untuk login biasa dan login setelah 2FA. */
export async function issueSession(user: SessionUser, req: NextRequest): Promise<NextResponse | null> {
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
    orderBy: { tenant: { name: "asc" } },
  });
  if (!membership) return null;

  const refreshToken = newToken();
  const now = new Date();
  const session = await db.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      label: deviceLabel(req.headers.get("user-agent")).slice(0, 191),
      ip: clientIp(req),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE * 1000),
    },
    select: { id: true },
  });

  const token = await signAccessToken(user.id, user.tokenVersion, session.id);
  const res = NextResponse.json({ ok: true, name: user.name, tenantId: membership.tenantId });
  setAuthCookies(res, token, refreshToken);
  setTenantCookie(res, membership.tenantId);
  void audit({
    action: "LOGIN_SUCCESS",
    userId: user.id,
    tenantId: membership.tenantId,
    entity: "Session",
    entityId: session.id,
    req,
  });
  return res;
}
