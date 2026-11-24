import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const ISSUER = "kasirku";
const AUDIENCE = "kasirku-app";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 30 * 86400;
export const ACCESS_COOKIE = "kk_token";
export const REFRESH_COOKIE = "kk_refresh";
export const TENANT_COOKIE = "kk_tenant";

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET wajib diisi dengan string acak minimal 32 karakter.");
  }
  return new TextEncoder().encode(value);
}

export async function signAccessToken(uid: number, tokenVersion = 0, sessionId?: number | null): Promise<string> {
  return new SignJWT({ tv: tokenVersion, ...(sessionId ? { sid: sessionId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(uid))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export type Viewer = {
  uid: number;
  name: string;
  email: string;
  sid: number | null;
};

async function verifyToken(token: string | undefined | null): Promise<Viewer | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub)) return null;
    const uid = Number(payload.sub);
    if (!Number.isSafeInteger(uid) || uid <= 0) return null;

    const user = await db.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, email: true, tokenVersion: true },
    });
    const tokenVersion = typeof payload.tv === "number" ? payload.tv : 0;
    if (!user || user.tokenVersion !== tokenVersion) return null;

    let sid: number | null = null;
    const rawSid = payload.sid;
    if (typeof rawSid === "number" && Number.isSafeInteger(rawSid) && rawSid > 0) sid = rawSid;
    else if (typeof rawSid === "string" && /^\d+$/.test(rawSid)) sid = Number(rawSid);

    if (sid) {
      const now = new Date();
      const session = await db.session.findFirst({
        where: { id: sid, userId: uid },
        select: { expiresAt: true, revokedAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt <= now) return null;
    }

    return { uid: user.id, name: user.name, email: user.email, sid };
  } catch {
    return null;
  }
}

/** Route Handler: token dari Bearer (PWA/native) atau cookie httpOnly (web). */
export async function viewerFromRequest(req: NextRequest): Promise<Viewer | null> {
  const authorization = req.headers.get("authorization");
  const fromHeader = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  return verifyToken(fromHeader ?? req.cookies.get(ACCESS_COOKIE)?.value);
}

/** Server Component baca token lewat cookies() — WAJIB di-await di Next 16. */
export async function currentViewer(): Promise<Viewer | null> {
  const store = await cookies();
  return verifyToken(store.get(ACCESS_COOKIE)?.value);
}
