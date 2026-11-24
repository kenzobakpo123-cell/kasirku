import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { consumeEmailToken } from "@/lib/email-tokens";
import { forbidden, isSameOrigin } from "@/lib/security";
import { passwordSchema } from "@/lib/schemas";

const schema = z.object({ token: z.string().min(1), password: passwordSchema });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Token tidak valid atau password minimal 8 karakter." }, { status: 400 });
  }

  const userId = await consumeEmailToken(parsed.data.token, "RESET");
  if (!userId) {
    return NextResponse.json({ error: "Link reset tidak valid atau sudah kedaluwarsa." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  void audit({ action: "PASSWORD_RESET", userId, req });
  return NextResponse.json({ ok: true, revokedSessions: true });
}
