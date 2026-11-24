import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { forbidden, isSameOrigin } from "@/lib/security";
import { encryptTotpSecret } from "@/lib/two-factor-secret";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });

  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: viewer.uid },
    data: { twoFactorSecret: encryptTotpSecret(secret), twoFactorEnabled: false, twoFactorRecoveryHash: null },
  });

  return NextResponse.json({ secret, uri: otpauthUrl(secret, viewer.email) });
}
