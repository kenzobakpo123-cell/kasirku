import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { consumeEmailToken } from "@/lib/email-tokens";
import { forbidden, isSameOrigin } from "@/lib/security";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });

  const userId = await consumeEmailToken(parsed.data.token, "VERIFY");
  if (!userId) {
    return NextResponse.json({ error: "Link verifikasi tidak valid atau sudah kedaluwarsa." }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  void audit({ action: "EMAIL_VERIFIED", userId, req });
  return NextResponse.json({ ok: true });
}
