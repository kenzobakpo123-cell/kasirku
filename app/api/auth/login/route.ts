import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { protectArcjet } from "@/lib/arcjet";
import { signTwoFactorChallenge } from "@/lib/auth";
import { issueSession } from "@/lib/auth-session";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin, rateLimit, resetRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/schemas";

const WRONG = { error: "Email atau password salah" };
const DUMMY_HASH = bcrypt.hashSync("kasirku-dummy-password-for-constant-time", 12);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const guard = await protectArcjet(req, "login");
  if (guard.denied) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status, headers: { "Retry-After": String(guard.retryAfter) } },
    );
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await bcrypt.compare("invalid-password", DUMMY_HASH);
    return NextResponse.json(WRONG, { status: 401 });
  }

  const { email, password } = parsed.data;
  const accountKey = `login-email:${email}`;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, tokenVersion: true, passwordHash: true, twoFactorEnabled: true },
  });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    void audit({ action: "LOGIN_FAILED", req });
    // Hanya percobaan gagal yang menghitung kuota. Login berhasil menghapus kuota.
    const limited = rateLimit(accountKey, 5, 15 * 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan untuk akun ini. Coba lagi ${limited.retryAfter} detik.` },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }
    return NextResponse.json(WRONG, { status: 401 });
  }

  resetRateLimit(accountKey);

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    select: { tenantId: true },
    orderBy: { tenant: { name: "asc" } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Akun belum memiliki toko. Hubungi administrator." }, { status: 403 });
  }

  if (user.twoFactorEnabled) {
    const challenge = await signTwoFactorChallenge(user.id);
    void audit({ action: "LOGIN_2FA_REQUIRED", userId: user.id, req });
    return NextResponse.json({ twoFactor: true, challenge });
  }

  const res = await issueSession(user, req);
  if (!res) return NextResponse.json({ error: "Akun belum memiliki toko. Hubungi administrator." }, { status: 403 });
  return res;
}
