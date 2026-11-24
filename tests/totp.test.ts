import { describe, expect, it } from "vitest";
import { fromBase32, generateTotpSecret, otpauthUrl, toBase32, totpAt, verifyTotp } from "@/lib/totp";

// RFC 6238 test vector untuk kunci "12345678901234567890".
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it("menghasilkan kode sesuai RFC 6238", () => {
    expect(totpAt(RFC_SECRET, 1)).toBe("287082");
    expect(totpAt(RFC_SECRET, 37_037_036)).toBe("081804");
  });

  it("base32 bisa dibaca balik", () => {
    const bytes = Buffer.from("kasirku-2fa");
    expect(fromBase32(toBase32(bytes)).toString()).toBe("kasirku-2fa");
  });

  it("menerima kode pada jendela ±1 periode dan menolak kode salah", () => {
    const now = 1_111_111_109_000;
    const code = totpAt(RFC_SECRET, Math.floor(now / 1000 / 30));
    expect(verifyTotp(RFC_SECRET, code, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, "000000", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", now)).toBe(false);
  });

  it("secret baru cocok dipakai authenticator", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(otpauthUrl(secret, "user@example.com")).toContain("otpauth://totp/Kasirku%3Auser%40example.com");
  });
});
