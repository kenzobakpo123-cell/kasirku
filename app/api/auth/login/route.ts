import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_MAX_AGE, signAccessToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setAuthCookies, setTenantCookie } from "@/lib/cookies";
import { db } from "@/lib/db";
import { clientIp, deviceLabel, forbidden, isSameOrigin, rateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/schemas";
import { hashToken, newToken } from "@/lib/tokens";

const WRONG = { error: "Email atau password salah" };
const DUMMY_HASH = bcrypt.hashSync("kasirku-dummy-password-for-constant-time", 12);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const perIp = rateLimit(`login-ip:${clientIp(req) ?? "unknown"}`, 30, 60_000);
  if (!perIp.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi ${perIp.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(perIp.retryAfter) } },
    );
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await bcrypt.compare("invalid-password", DUMMY_HASH);
    return NextResponse.json(WRONG, { status: 401 });
  }

  const { email, password } = parsed.data;
  const perAccount = rateLimit(`login-email:${email}`, 5, 15 * 60_000);
  if (!perAccount.allowed) {
    await bcrypt.compare(password, DUMMY_HASH);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan untuk akun ini. Coba lagi ${perAccount.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(perAccount.retryAfter) } },
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true, tokenVersion: true },
  });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    void audit({ action: "LOGIN_FAILED", req });
    return NextResponse.json(WRONG, { status: 401 });
  }

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
    orderBy: { tenant: { name: "asc" } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Akun belum memiliki toko. Hubungi administrator." }, { status: 403 });
  }

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
