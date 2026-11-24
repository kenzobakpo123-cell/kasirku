import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Dipakai untuk cek deploy: 200 bila aplikasi dan database siap. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
