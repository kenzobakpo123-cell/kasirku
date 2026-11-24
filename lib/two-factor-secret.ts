import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Secret TOTP dienkripsi AES-256-GCM sebelum disimpan di database. */
function key(): Buffer {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET wajib diisi minimal 32 karakter.");
  return createHash("sha256").update(value).digest();
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(":");
}

export function decryptTotpSecret(stored: string): string {
  const [iv, tag, encrypted] = stored.split(":").map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !encrypted) throw new Error("Secret TOTP rusak.");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Kode pemulihan sekali pakai; hanya hash bcrypt yang disimpan. */
export function newRecoveryCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}
