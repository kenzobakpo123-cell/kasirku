import { afterEach, describe, expect, it } from "vitest";
import { resetMail, verificationMail } from "@/lib/mail";

const previousUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = previousUrl;
});

describe("email link", () => {
  it("membuat link verifikasi dengan token ter-encode", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://kasirku.example";
    const mail = verificationMail("owner@toko.test", "abc/123");
    expect(mail.subject).toContain("Verifikasi");
    expect(mail.text).toContain("https://kasirku.example/verifikasi-email?token=abc%2F123");
  });

  it("membuat link reset yang berbeda dari verifikasi", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://kasirku.example";
    const reset = resetMail("owner@toko.test", "token");
    const verify = verificationMail("owner@toko.test", "token");
    expect(reset.text).toContain("/reset-password?token=token");
    expect(verify.text).toContain("/verifikasi-email?token=token");
    expect(reset.subject).not.toBe(verify.subject);
  });
});
