import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createReferralCode, isAgency, listReferralCodes } from "@/lib/agency";
import { viewerFromRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { forbidden, isSameOrigin } from "@/lib/security";

const schema = z.object({ commissionBps: z.number().int().min(0).max(3000).default(1500) });

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });
  if (!(await isAgency(viewer.uid))) {
    return NextResponse.json({ error: "Akun ini bukan agensi." }, { status: 403 });
  }
  return NextResponse.json({ codes: await listReferralCodes(viewer.uid) });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });
  if (!(await isAgency(viewer.uid))) {
    return NextResponse.json({ error: "Akun ini bukan agensi." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Komisi tidak valid" }, { status: 400 });

  const code = await createReferralCode(viewer.uid, parsed.data.commissionBps);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  void audit({ action: "REFERRAL_CREATE", userId: viewer.uid, entity: "ReferralCode", entityId: code.id, req });
  return NextResponse.json(
    { code, link: `${origin}/register?ref=${code.code}` },
    { status: 201 },
  );
}
