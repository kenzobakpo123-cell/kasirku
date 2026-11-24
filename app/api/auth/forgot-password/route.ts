import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { protectArcjet } from "@/lib/arcjet";
import { createEmailToken } from "@/lib/email-tokens";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { resetMail, sendMail } from "@/lib/mail";
import { forbidden, isSameOrigin } from "@/lib/security";

const schema = z.object({ email: z.email().max(120).transform((value) => value.toLowerCase()) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const guard = await protectArcjet(req, "write");
  if (guard.denied) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status, headers: { "Retry-After": String(guard.retryAfter) } },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });

  // Selalu balas 200 supaya tidak membocorkan email yang terdaftar.
  if (!user) return NextResponse.json({ ok: true });

  try {
    const token = await createEmailToken(user.id, "RESET");
    const result = await sendMail(resetMail(user.email, token));
    void audit({ action: "PASSWORD_RESET_REQUEST", userId: user.id, req });
    return NextResponse.json({ ok: true, ...(result.devUrl ? { devUrl: result.devUrl } : {}) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim email." },
      { status: 503 },
    );
  }
}
