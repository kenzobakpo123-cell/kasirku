import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";
import { passwordSchema } from "@/lib/schemas";

const schema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: passwordSchema,
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Password baru minimal 8 karakter dan maksimal 72 byte." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: viewer.uid },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Password lama tidak benar." }, { status: 400 });
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Password baru harus berbeda dari yang lama." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.$transaction([
    db.user.update({ where: { id: viewer.uid }, data: { passwordHash } }),
    db.session.updateMany({
      where: { userId: viewer.uid, id: { not: viewer.sid ?? -1 }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  void audit({ action: "PASSWORD_CHANGE", userId: viewer.uid, req });
  return NextResponse.json({ ok: true, revokedOthers: true });
}
