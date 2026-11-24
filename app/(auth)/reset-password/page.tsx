import type { Metadata } from "next";
import { EmailActionForm } from "@/components/email-action-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <EmailActionForm mode="reset" token={token ?? ""} />;
}
