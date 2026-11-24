import type { Metadata } from "next";
import { EmailActionForm } from "@/components/email-action-form";

export const metadata: Metadata = { title: "Verifikasi Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <EmailActionForm mode="verify" token={token ?? ""} />;
}
