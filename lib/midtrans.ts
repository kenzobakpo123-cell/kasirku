import { createHmac, timingSafeEqual } from "node:crypto";

export type MidtransConfig = {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  apiUrl: string;
  snapUrl: string;
};

export function midtransConfig(): MidtransConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? serverKey;
  if (!serverKey || !clientKey) return null;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return {
    serverKey,
    clientKey,
    isProduction,
    apiUrl: isProduction ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2",
    snapUrl: isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions",
  };
}

/** Signature key Snap = SHA512(order_id + status_code + gross_amount + server_key). */
export function snapSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return createHmac("sha512", serverKey).update(`${orderId}${statusCode}${grossAmount}`).digest("hex");
}

/** Webhook notification wajib diverifikasi: SHA512(order_id + status_code + gross_amount + server_key). */
export function verifyNotificationSignature(body: Record<string, unknown>, serverKey: string): boolean {
  const { order_id, status_code, gross_amount, signature_key } = body;
  if (
    typeof order_id !== "string" ||
    typeof status_code !== "string" ||
    typeof gross_amount !== "string" ||
    typeof signature_key !== "string"
  ) {
    return false;
  }
  const expected = snapSignature(order_id, status_code, gross_amount, serverKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature_key, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function midtransAuth(config: MidtransConfig): string {
  return `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`;
}
