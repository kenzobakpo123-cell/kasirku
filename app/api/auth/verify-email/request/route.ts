import { NextRequest, NextResponse } from "next/server";
import { protectArcjet } from "@/lib/arcjet";
import { viewerFromRequest } from "@/lib/auth";
import { createEmailToken } from "@/lib/email-tokens";
import { db } from "@/lib/db";
import { sendMail, verificationMail } from "@/lib/mail";
import { forbidden, isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const guard = await protectArcjet(req, "write");
  if (guard.denied) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status, headers: { "Retry-After": String(guard.retryAfter) } },
    );
  }

  const user = await db.user.findUnique({
    where: { id: viewer.uid },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  try {
    const token = await createEmailToken(viewer.uid, "VERIFY");
    const result = await sendMail(verificationMail(user.email, token));
    return NextResponse.json({ ok: true, ...(result.devUrl ? { devUrl: result.devUrl } : {}) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim email." },
      { status: 503 },
    );
  }
}
