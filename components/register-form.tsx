"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export function RegisterForm() {
  const params = useSearchParams();
  return <AuthForm mode="register" defaultReferral={params.get("ref") ?? ""} />;
}
