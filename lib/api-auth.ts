import { NextResponse, type NextRequest } from "next/server";
import type { Viewer } from "@/lib/auth";
import { viewerFromRequest } from "@/lib/auth";
import type { MembershipInfo } from "@/lib/tenant";
import { membershipFor, tenantFromRequest } from "@/lib/tenant";

export type TenantContext = {
  viewer: Viewer;
  tenantId: number;
  membership: MembershipInfo;
};

type Result = { ctx: TenantContext; error?: undefined } | { ctx?: undefined; error: NextResponse };

/**
 * Satu pintu masuk untuk semua endpoint data: autentikasi + tenant aktif +
 * verifikasi membership. Tidak ada query yang boleh lolos tanpa tenantId.
 */
export async function tenantContext(req: NextRequest): Promise<Result> {
  const viewer = await viewerFromRequest(req);
  if (!viewer) {
    return { error: NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 }) };
  }

  const tenantId = tenantFromRequest(req);
  if (!tenantId) {
    return { error: NextResponse.json({ error: "Toko aktif belum dipilih." }, { status: 400 }) };
  }

  const membership = await membershipFor(viewer.uid, tenantId);
  if (!membership) {
    return { error: NextResponse.json({ error: "Kamu tidak memiliki akses ke toko ini." }, { status: 403 }) };
  }

  return { ctx: { viewer, tenantId, membership } };
}
