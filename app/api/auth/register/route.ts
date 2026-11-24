import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE, signAccessToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setAuthCookies, setTenantCookie } from "@/lib/cookies";
import { db } from "@/lib/db";
import { deviceLabel, forbidden, isSameOrigin, rateLimit, clientIp } from "@/lib/security";
import { registerSchema } from "@/lib/schemas";
import { hashToken, newToken } from "@/lib/tokens";

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "toko"}-${randomBytes(3).toString("hex")}`;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const limited = rateLimit(`register:${clientIp(req) ?? "unknown"}`, 10, 60 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak pendaftaran. Coba lagi ${limited.retryAfter} detik.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, tenantName, referralCode } = parsed.data;
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  const referral = referralCode
    ? await db.referralCode.findFirst({
        where: { code: referralCode.toUpperCase(), active: true },
        select: { id: true, agencyId: true, commissionBps: true },
      })
    : null;
  if (referralCode && !referral) {
    return NextResponse.json({ error: "Kode referral tidak valid atau sudah tidak aktif." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const refreshToken = newToken();
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, tokenVersion: true },
    });
    const tenant = await tx.tenant.create({
      data: { name: tenantName, slug: slugify(tenantName), ownerId: user.id },
      select: { id: true, name: true, slug: true },
    });
    await tx.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: "OWNER" } });
    await tx.outlet.create({ data: { tenantId: tenant.id, name: "Kasir Utama" } });
    await tx.subscription.create({ data: { tenantId: tenant.id, plan: "FREE", status: "ACTIVE" } });
    if (referral) {
      await tx.referral.create({
        data: {
          codeId: referral.id,
          agencyId: referral.agencyId,
          tenantId: tenant.id,
          commissionBps: referral.commissionBps,
        },
      });
      // Agensi otomatis mendapat akses ke toko klien yang direferensikannya.
      if (referral.agencyId !== user.id) {
        await tx.membership.create({
          data: { userId: referral.agencyId, tenantId: tenant.id, role: "AGENCY" },
        });
      }
    }
    const session = await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        label: deviceLabel(req.headers.get("user-agent")).slice(0, 191),
        ip: clientIp(req),
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE * 1000),
      },
      select: { id: true },
    });
    return { user, tenant, session };
  });

  const token = await signAccessToken(result.user.id, result.user.tokenVersion, result.session.id);
  const res = NextResponse.json(
    { ok: true, tenant: result.tenant, referredBy: Boolean(referral), expiresIn: ACCESS_TOKEN_MAX_AGE },
    { status: 201 },
  );
  setAuthCookies(res, token, refreshToken);
  setTenantCookie(res, result.tenant.id);
  void audit({
    action: "REGISTER",
    userId: result.user.id,
    tenantId: result.tenant.id,
    entity: "Tenant",
    entityId: result.tenant.id,
    req,
  });
  return res;
}
