const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

/** Normalisasi nomor Indonesia ke format E.164 (62…). */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let national = digits;
  if (digits.startsWith("620")) national = digits.slice(2);
  else if (digits.startsWith("62")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else if (digits.startsWith("8")) national = digits;
  else return null;

  const phone = `62${national}`;
  return /^62\d{8,13}$/.test(phone) ? phone : null;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export type WhatsAppResult = { sent: boolean; url?: string };

/**
 * Kirim via WhatsApp Business Cloud API. Tanpa kredensial, development
 * mengembalikan tautan wa.me yang sudah ditujukan ke pembeli; production
 * mengembalikan error supaya konfigurasi tidak terlewat.
 */
export async function sendWhatsApp(input: { to: string; text: string }): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WHATSAPP_ACCESS_TOKEN dan WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi.");
    }
    console.info(`[Kasirku WA dev] ke ${input.to}\n${input.text}`);
    return { sent: false, url: waLink(input.to, input.text) };
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: { body: input.text, preview_url: false },
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Gagal mengirim WhatsApp (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return { sent: true };
}
