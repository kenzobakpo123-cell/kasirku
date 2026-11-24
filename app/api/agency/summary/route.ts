import { NextRequest, NextResponse } from "next/server";
import { viewerFromRequest } from "@/lib/auth";
import { getAgencySummary, isAgency } from "@/lib/agency";

export async function GET(req: NextRequest) {
  const viewer = await viewerFromRequest(req);
  if (!viewer) return NextResponse.json({ error: "Silakan masuk lagi." }, { status: 401 });
  if (!(await isAgency(viewer.uid))) {
    return NextResponse.json({ error: "Akun ini bukan agensi." }, { status: 403 });
  }
  return NextResponse.json({ summary: await getAgencySummary(viewer.uid) });
}
