import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin, rateLimit } from "@/lib/security";
import { decryptTotpSecret, newRecoveryCode } from "@/lib/two-factor-secret";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const hit = rateLimit(`2fa-setup:${viewer.uid}`, 10, 15 * 60_000);
  if (!hit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Masukkan 6 digit kode." }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: viewer.uid },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Mulai pengaturan ulang dua faktor dulu." }, { status: 400 });
  }

  let valid = false;
  try {
    valid = verifyTotp(decryptTotpSecret(user.twoFactorSecret), parsed.data.code);
  } catch {
    valid = false;
  }
  if (!valid) return NextResponse.json({ error: "Kode salah." }, { status: 401 });

  const recoveryCode = newRecoveryCode();
  await db.user.update({
    where: { id: viewer.uid },
    data: {
      twoFactorEnabled: true,
      twoFactorRecoveryHash: await bcrypt.hash(recoveryCode, 10),
    },
  });
  void audit({ action: "TWO_FACTOR_ENABLED", userId: viewer.uid, req });
  return NextResponse.json({ ok: true, recoveryCode });
}
