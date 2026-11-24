"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export function AuthForm({ mode, defaultReferral = "" }: { mode: Mode; defaultReferral?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const body = isRegister
      ? {
          name: String(form.get("name") ?? ""),
          tenantName: String(form.get("tenantName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          referralCode: String(form.get("referralCode") ?? "") || undefined,
        }
      : {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Coba lagi.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <h1>{isRegister ? "Buat toko pertama" : "Selamat datang kembali"}</h1>
      <p className="lead">
        {isRegister ? "Isi data singkat untuk mulai pakai Kasirku." : "Masuk untuk melanjutkan ke dashboard."}
      </p>

      <form className="card" onSubmit={handleSubmit}>
        {error ? <div className="error" role="alert">{error}</div> : null}

        {isRegister ? (
          <>
            <label className="field">
              <span>Kode referral <span className="muted">(opsional)</span></span>
              <input className="input" name="referralCode" defaultValue={defaultReferral} placeholder="MASUKKAN-KODE" />
            </label>
            <label className="field">
              <span>Nama kamu</span>
              <input className="input" name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </label>
            <label className="field">
              <span>Nama toko</span>
              <input className="input" name="tenantName" required minLength={2} maxLength={120} />
            </label>
          </>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            name="password"
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Tunggu sebentar…" : isRegister ? "Buat akun & toko" : "Masuk"}
        </button>
        {!isRegister ? (
          <p className="small muted" style={{ marginBottom: 0 }}>
            <Link href="/lupa-password">Lupa password?</Link>
          </p>
        ) : null}
      </form>

      <p className="hint">
        {isRegister ? (
          <>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </>
        ) : (
          <>
            Belum punya akun? <Link href="/register">Daftar gratis</Link>
          </>
        )}
      </p>
    </main>
  );
}
