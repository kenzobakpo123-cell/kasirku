"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Mode = "forgot" | "reset" | "verify";

export function EmailActionForm({ mode, token = "" }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const title = mode === "forgot" ? "Lupa password" : mode === "reset" ? "Password baru" : "Verifikasi email";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const url = mode === "forgot" ? "/api/auth/forgot-password" : mode === "reset" ? "/api/auth/reset-password" : "/api/auth/verify-email";
      const body = mode === "forgot" ? { email } : mode === "reset" ? { token, password } : { token };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; devUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Permintaan gagal.");

      if (mode === "forgot") {
        setNotice(
          data.devUrl
            ? `Mode development — link reset: ${data.devUrl}`
            : "Kalau email terdaftar, link reset sudah dikirim. Cek inbox kamu.",
        );
      } else if (mode === "reset") {
        setNotice("Password berhasil diganti. Semua perangkat lain telah dicabut.");
        window.setTimeout(() => router.push("/login"), 1500);
      } else {
        setNotice("Email berhasil diverifikasi.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permintaan gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <h1>{title}</h1>
      <p className="lead">
        {mode === "forgot"
          ? "Masukkan email akun; kami kirim link reset yang berlaku 60 menit."
          : mode === "reset"
            ? "Pilih password baru minimal 8 karakter."
            : "Konfirmasi alamat email akun Kasirku kamu."}
      </p>

      <form className="card" onSubmit={submit}>
        {error ? <div className="error" role="alert">{error}</div> : null}
        {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

        {mode === "forgot" ? (
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
        ) : null}
        {mode === "reset" ? (
          <label className="field">
            <span>Password baru</span>
            <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
        ) : null}
        {!token && mode !== "forgot" ? (
          <div className="error" role="alert">Link tidak lengkap. Buka link dari email kamu.</div>
        ) : null}

        <button className="btn btn-primary" type="submit" disabled={loading || (!token && mode !== "forgot")} style={{ width: "100%" }}>
          {loading ? "Memproses…" : mode === "forgot" ? "Kirim link reset" : mode === "reset" ? "Simpan password baru" : "Verifikasi sekarang"}
        </button>
      </form>

      <p className="hint"><Link href="/login">← Kembali ke masuk</Link></p>
    </main>
  );
}
