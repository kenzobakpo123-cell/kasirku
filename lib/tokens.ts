import { createHash, randomBytes } from "node:crypto";

/** Token mentah hanya dikirim sekali; database menyimpan hash SHA-256-nya. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidRefreshToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}
