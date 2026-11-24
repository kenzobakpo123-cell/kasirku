const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = () => process.env.EMAIL_FROM ?? "Kasirku <onboarding@resend.dev>";

export type MailResult = { sent: boolean; devUrl?: string };

/**
 * Mengirim email lewat Resend REST API (tanpa dependency tambahan).
 * Saat RESEND_API_KEY kosong dan masih development, link dikembalikan ke caller
 * supaya alur bisa diuji tanpa email. Di production, konfigurasi wajib.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY belum dikonfigurasi.");
    }
    console.info(`[Kasirku mail dev] ${input.subject}\n${input.text}`);
    const link = input.text.match(/https?:\/\/\S+/)?.[0];
    return { sent: false, devUrl: link };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Gagal mengirim email (${res.status}).`);
  }
  return { sent: true };
}

export function verificationMail(to: string, token: string): Parameters<typeof sendMail>[0] {
  const url = `${APP_URL()}/verifikasi-email?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Verifikasi email Kasirku",
    text: `Halo,\n\nKlik link ini untuk memverifikasi email akun Kasirku kamu:\n${url}\n\nLink berlaku 24 jam. Kalau bukan kamu, abaikan email ini.`,
  };
}

export function resetMail(to: string, token: string): Parameters<typeof sendMail>[0] {
  const url = `${APP_URL()}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: "Reset password Kasirku",
    text: `Halo,\n\nKlik link ini untuk membuat password baru:\n${url}\n\nLink berlaku 60 menit. Kalau bukan kamu, abaikan email ini — password kamu tetap aman.`,
  };
}
