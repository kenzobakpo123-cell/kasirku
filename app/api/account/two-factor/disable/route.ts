import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin, rateLimit } from "@/lib/security";
import { decryptTotpSecret } from "@/lib/two-factor-secret";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({ code: z.string().trim().min(6).max(16), password: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const hit = rateLimit(`2fa-disable:${viewer.uid}`, 5, 15 * 60_000);
  if (!hit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: viewer.uid },
    select: { passwordHash: true, twoFactorSecret: true, twoFactorRecoveryHash: true },
  });
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  const code = parsed.data.code.replace(/\s/g, "");
  let codeOk = false;
  if (user.twoFactorSecret) {
    try {
      codeOk = verifyTotp(decryptTotpSecret(user.twoFactorSecret), code);
    } catch {
      codeOk = false;
    }
  }
  if (!codeOk && user.twoFactorRecoveryHash) {
    codeOk = await bcrypt.compare(code, user.twoFactorRecoveryHash);
  }
  if (!passwordOk || !codeOk) return NextResponse.json({ error: "Password atau kode salah." }, { status: 401 });

  await db.user.update({
    where: { id: viewer.uid },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryHash: null },
  });
  void audit({ action: "TWO_FACTOR_DISABLED", userId: viewer.uid, req });
  return NextResponse.json({ ok: true });
}
