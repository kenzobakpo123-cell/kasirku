import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastCleanup = 0;

/** Rate limiter in-memory untuk development/fallback. Produksi pakai proxy/gateway. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup > 60_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    lastCleanup = now;
  }

  const rec = buckets.get(key);
  if (!rec || rec.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (rec.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
  }
  rec.count += 1;
  return { allowed: true, retryAfter: 0 };
}

const IP_PATTERN = /^[0-9a-fA-F.:]+$/;

export function clientIp(req: NextRequest): string | null {
  const vercelHop = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwarded = req.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const lastHop = forwarded?.[forwarded.length - 1];
  const real = req.headers.get("x-real-ip")?.trim();
  const candidate = [vercelHop, lastHop, real].find((value) => value && IP_PATTERN.test(value));
  return candidate ? candidate.slice(0, 191) : null;
}

function allowedOrigin(origin: string): boolean {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return false;
  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

/**
 * CSRF guard untuk mutasi berbasis cookie. Klien PWA boleh memakai header
 * `X-Kasirku-Client`, browser tidak bisa mengirimnya lintas origin tanpa CORS.
 */
export function isSameOrigin(req: NextRequest): boolean {
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true;
  if (req.headers.get("x-kasirku-client") === "pwa") return true;

  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") return true;
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return false;
  return allowedOrigin(origin);
}

export const forbidden = () => new Response("Forbidden", { status: 403 });

export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Perangkat tidak dikenal";
  const browser = /Firefox|Edg|Chrome|Safari|OPR/i.exec(userAgent)?.[0] ?? "Browser";
  const os = /Windows|Android|iPhone|iPad|Mac OS X|Linux/i.exec(userAgent)?.[0] ?? "OS tidak dikenal";
  return `${browser} di ${os}`.slice(0, 191);
}
