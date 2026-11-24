import type { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  TENANT_COOKIE,
} from "@/lib/auth";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string): void {
  res.cookies.set(ACCESS_COOKIE, accessToken, { ...base, maxAge: ACCESS_TOKEN_MAX_AGE });
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: REFRESH_TOKEN_MAX_AGE });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
  res.cookies.set(TENANT_COOKIE, "", { ...base, maxAge: 0 });
}

export function setTenantCookie(res: NextResponse, tenantId: number): void {
  res.cookies.set(TENANT_COOKIE, String(tenantId), { ...base, maxAge: REFRESH_TOKEN_MAX_AGE });
}
