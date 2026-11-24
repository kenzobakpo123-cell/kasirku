import { describe, expect, it } from "vitest";
import { snapSignature, verifyNotificationSignature } from "@/lib/midtrans";

const KEY = "server-rahasia";

describe("Midtrans signature", () => {
  it("hanya menerima signature yang benar", () => {
    const body = {
      order_id: "KK-1-ABC",
      status_code: "200",
      gross_amount: "199000",
    };
    const signature_key = snapSignature(body.order_id, body.status_code, body.gross_amount, KEY);
    expect(verifyNotificationSignature({ ...body, signature_key }, KEY)).toBe(true);
    expect(verifyNotificationSignature({ ...body, signature_key: "0".repeat(128) }, KEY)).toBe(false);
  });

  it("menolak field yang tidak lengkap atau salah tipe", () => {
    expect(verifyNotificationSignature({ order_id: 1, signature_key: "x" }, KEY)).toBe(false);
    expect(verifyNotificationSignature({}, KEY)).toBe(false);
  });

  it("signature berubah jika nominal diubah", () => {
    const a = snapSignature("A", "200", "1000", KEY);
    const b = snapSignature("A", "200", "2000", KEY);
    expect(a).not.toBe(b);
  });
});
