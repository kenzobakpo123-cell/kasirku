import { describe, expect, it } from "vitest";
import { hashToken, isValidRefreshToken, newToken } from "@/lib/tokens";

describe("tokens", () => {
  it("token baru berupa 64 karakter hex", () => {
    expect(isValidRefreshToken(newToken())).toBe(true);
  });

  it("hash deterministik sepanjang 64 karakter", () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
  });

  it("menolak token dengan format salah", () => {
    expect(isValidRefreshToken("abc")).toBe(false);
    expect(isValidRefreshToken(123)).toBe(false);
  });
});
