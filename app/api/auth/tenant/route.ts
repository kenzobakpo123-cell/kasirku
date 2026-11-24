import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { viewerFromRequest } from "@/lib/auth";
import { setTenantCookie } from "@/lib/cookies";
import { forbidden, isSameOrigin } from "@/lib/security";
import { membershipFor } from "@/lib/tenant";

const schema = z.object({ tenantId: z.number().int().positive() });
const unauthorized = () => NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

/** Ganti toko aktif — dipakai agensi yang mengelola banyak tenant. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (!viewer) return unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const membership = await membershipFor(viewer.uid, parsed.data.tenantId);
  if (!membership) return NextResponse.json({ error: "Kamu tidak memiliki akses ke toko ini." }, { status: 403 });

  const res = NextResponse.json({ ok: true, tenant: membership.tenant, role: membership.role });
  setTenantCookie(res, membership.tenantId);
  return res;
}
