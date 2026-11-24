import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clearAuthCookies } from "@/lib/cookies";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (viewer?.sid) {
    await db.session.updateMany({
      where: { id: viewer.sid, userId: viewer.uid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    void audit({ action: "LOGOUT", userId: viewer.uid, entity: "Session", entityId: viewer.sid, req });
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
