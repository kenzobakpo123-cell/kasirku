import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="container auth-wrap"><p className="muted">Memuat…</p></main>}>
      <RegisterForm />
    </Suspense>
  );
}
