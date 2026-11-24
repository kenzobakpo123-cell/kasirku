import { NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_MAX_AGE, signAccessToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clearAuthCookies, setAuthCookies } from "@/lib/cookies";
import { db } from "@/lib/db";
import { clientIp, forbidden, isSameOrigin, rateLimit } from "@/lib/security";
import { hashToken, isValidRefreshToken, newToken } from "@/lib/tokens";

const unauthorized = () => NextResponse.json({ error: "Sesi sudah berakhir. Silakan masuk lagi." }, { status: 401 });

/**
 * Refresh token diputar tiap dipakai. `updateMany` bersyarat memastikan hanya
 * satu request yang menang saat ada race condition. `previousTokenHash`
 * dipakai untuk mendeteksi replay (token bocor) dan mencabut semua sesi.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const limited = rateLimit(`refresh:${clientIp(req) ?? "unknown"}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi ${limited.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const rawToken = req.cookies.get("kk_refresh")?.value;
  if (!isValidRefreshToken(rawToken)) return unauthorized();

  const oldHash = hashToken(rawToken);
  const now = new Date();

  const replay = await db.session.findFirst({
    where: { previousTokenHash: oldHash },
    select: { id: true, userId: true },
  });
  if (replay) {
    await db.session.updateMany({
      where: { userId: replay.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await db.user.update({ where: { id: replay.userId }, data: { tokenVersion: { increment: 1 } } });
    void audit({ action: "SESSION_TOKEN_REUSE", userId: replay.userId, entity: "Session", entityId: replay.id, req });
    const res = NextResponse.json(
      { error: "Token sesi terdeteksi dipakai ulang. Semua perangkat telah dicabut." },
      { status: 401 },
    );
    clearAuthCookies(res);
    return res;
  }

  const nextRefresh = newToken();
  const rotated = await db.session.updateMany({
    where: { tokenHash: oldHash, revokedAt: null, expiresAt: { gt: now } },
    data: {
      tokenHash: hashToken(nextRefresh),
      previousTokenHash: oldHash,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE * 1000),
    },
  });
  if (rotated.count !== 1) return unauthorized();

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(nextRefresh) },
    select: { id: true, userId: true, user: { select: { tokenVersion: true } } },
  });
  if (!session) return unauthorized();

  const accessToken = await signAccessToken(session.userId, session.user.tokenVersion, session.id);
  const res = NextResponse.json({ ok: true });
  setAuthCookies(res, accessToken, nextRefresh);
  void audit({ action: "SESSION_REFRESH", userId: session.userId, entity: "Session", entityId: session.id, req });
  return res;
}
