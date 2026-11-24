import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { protectArcjet } from "@/lib/arcjet";
import { verifyTwoFactorChallenge } from "@/lib/auth";
import { issueSession } from "@/lib/auth-session";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin, rateLimit } from "@/lib/security";
import { decryptTotpSecret } from "@/lib/two-factor-secret";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({
  challenge: z.string().min(10).max(2000),
  code: z.string().trim().min(6).max(16),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const guard = await protectArcjet(req, "login");
  if (guard.denied) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status, headers: { "Retry-After": String(guard.retryAfter) } },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });

  const uid = await verifyTwoFactorChallenge(parsed.data.challenge);
  if (!uid) return NextResponse.json({ error: "Sesi verifikasi habis. Silakan masuk lagi." }, { status: 401 });

  const hit = rateLimit(`2fa:${uid}`, 5, 5 * 60_000);
  if (!hit.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan kode. Coba lagi ${hit.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(hit.retryAfter) } },
    );
  }

  const user = await db.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      name: true,
      tokenVersion: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryHash: true,
    },
  });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "Two-factor authentication tidak aktif." }, { status: 400 });
  }

  const code = parsed.data.code.replace(/\s/g, "");
  let accepted = false;
  let usedRecovery = false;
  try {
    accepted = verifyTotp(decryptTotpSecret(user.twoFactorSecret), code);
  } catch {
    accepted = false;
  }
  if (!accepted && user.twoFactorRecoveryHash) {
    accepted = await bcrypt.compare(code, user.twoFactorRecoveryHash);
    usedRecovery = accepted;
  }
  if (!accepted) {
    void audit({ action: "LOGIN_2FA_FAILED", userId: uid, req });
    return NextResponse.json({ error: "Kode salah atau sudah kedaluwarsa." }, { status: 401 });
  }

  if (usedRecovery) {
    // Kode pemulihan hanya bisa dipakai sekali dan harus dibuat ulang.
    await db.user.update({ where: { id: uid }, data: { twoFactorRecoveryHash: null } });
  }

  const res = await issueSession(user, req);
  if (!res) return NextResponse.json({ error: "Akun belum memiliki toko. Hubungi administrator." }, { status: 403 });
  void audit({ action: "LOGIN_2FA_SUCCESS", userId: uid, req });
  return res;
}
