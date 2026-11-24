import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailToken } from "@/lib/email-tokens";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { resetMail, sendMail } from "@/lib/mail";
import { clientIp, forbidden, isSameOrigin, rateLimit } from "@/lib/security";

const schema = z.object({ email: z.email().max(120) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const limited = rateLimit(`forgot:${clientIp(req) ?? "unknown"}`, 5, 60 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi ${limited.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
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
