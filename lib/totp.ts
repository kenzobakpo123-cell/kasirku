import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD = 30;
const DIGITS = 6;

/** Base32 tanpa padding, sesuai format yang dipakai aplikasi authenticator. */
export function toBase32(bytes: Buffer): string {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return out;
}

export function fromBase32(value: string): Buffer {
  const clean = value.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = "";
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Secret TOTP tidak valid.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return toBase32(randomBytes(20));
}

/** RFC 6238: HMAC-SHA1, 6 digit, 30 detik. */
export function totpAt(secret: string, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", fromBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(value % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 1000 / PERIOD);
  for (const delta of [-1, 0, 1]) {
    const expected = totpAt(secret, counter + delta);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, email: string): string {
  const label = encodeURIComponent(`Kasirku:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Kasirku&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}
