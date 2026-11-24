import arcjet, { shield, slidingWindow, validateEmail } from "@arcjet/next";
import type { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";

/**
 * Proteksi terpusat: Shield (WAF), validasi email, dan rate limit lintas instance.
 * Tanpa ARCJET_KEY (development) atau saat Arcjet error, pakai fallback in-memory
 * dengan batas lebih ketat supaya endpoint auth tidak menjadi celah.
 */
const key = process.env.ARCJET_KEY;
const base = key ? arcjet({ key, rules: [shield({ mode: "LIVE" })] }) : null;

const guards = base
  ? {
      login: base.withRule(slidingWindow({ mode: "LIVE", interval: "15m", max: 30 })),
      register: base
        .withRule(validateEmail({ mode: "LIVE", deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"] }))
        .withRule(slidingWindow({ mode: "LIVE", interval: "1h", max: 5 })),
      write: base.withRule(slidingWindow({ mode: "LIVE", interval: "1m", max: 60 })),
    }
  : null;

export type GuardName = "login" | "register" | "write";

type Verdict = { denied: boolean; status: number; error: string; retryAfter: number };

const allow = (): Verdict => ({ denied: false, status: 200, error: "", retryAfter: 0 });

const FALLBACK_LIMITS: Record<GuardName, { limit: number; window: number }> = {
  login: { limit: 10, window: 15 * 60_000 },
  register: { limit: 3, window: 60 * 60_000 },
  write: { limit: 30, window: 60_000 },
};

function fallback(name: GuardName, req: NextRequest): Verdict {
  const { limit, window } = FALLBACK_LIMITS[name];
  const hit = rateLimit(`arcjet:${name}:${clientIp(req) ?? "unknown"}`, limit, window);
  return hit.allowed
    ? allow()
    : {
        denied: true,
        status: 429,
        error: "Terlalu banyak permintaan. Tunggu sebentar.",
        retryAfter: hit.retryAfter,
      };
}

export async function protectArcjet(req: NextRequest, name: GuardName, email?: string): Promise<Verdict> {
  if (!guards) return fallback(name, req);

  try {
    const decision =
      name === "register"
        ? await guards.register.protect(req, { email: email ?? "" })
        : await guards[name === "login" ? "login" : "write"].protect(req);

    if (decision.isErrored()) {
      console.error("Arcjet error:", decision.reason.message);
      return fallback(name, req);
    }

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          denied: true,
          status: 429,
          error: "Terlalu banyak permintaan. Tunggu sebentar.",
          retryAfter: Math.max(1, Math.ceil(decision.reason.reset)),
        };
      }
      if (decision.reason.isEmail()) {
        return { denied: true, status: 400, error: "Alamat email tidak valid.", retryAfter: 0 };
      }
      if (decision.reason.isBot() || decision.reason.isShield()) {
        return { denied: true, status: 403, error: "Permintaan ditolak.", retryAfter: 0 };
      }
      return { denied: true, status: 403, error: "Permintaan ditolak.", retryAfter: 0 };
    }

    return allow();
  } catch (error) {
    console.error("Arcjet exception:", error);
    return fallback(name, req);
  }
}
