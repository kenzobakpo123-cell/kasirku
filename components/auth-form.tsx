"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export function AuthForm({ mode, defaultReferral = "" }: { mode: Mode; defaultReferral?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
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
      const data = (await res.json()) as { error?: string; twoFactor?: boolean; challenge?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Coba lagi.");
        return;
      }
      if (data.twoFactor && data.challenge) {
        setChallenge(data.challenge);
        setCode("");
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

  async function handleTwoFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" },
        body: JSON.stringify({ challenge, code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kode tidak valid.");
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
    <main className="auth-layout">
      <aside className="auth-aside">
        <div>
          <Link href="/" className="logo" style={{ color: "#fff", marginBottom: 44 }}>
            <span className="logo-mark">K</span>
            Kasirku
          </Link>
          <h2>{isRegister ? "Toko rapi mulai hari ini." : "Selamat datang kembali."}</h2>
          <p>
            Satu tempat untuk kasir, stok, dan laporan. Dirancang untuk UMKM yang bergerak cepat,
            dan untuk agensi yang mendampingi banyak klien.
          </p>
          <ul>
            <li>Tanpa kartu kredit untuk mulai</li>
            <li>Stok aman dari transaksi ganda</li>
            <li>Bisa dipakai di HP dan tablet</li>
          </ul>
        </div>
        <div className="aside-foot">Kasirku · dibuat untuk UMKM Indonesia</div>
      </aside>

      <section className="auth-panel">
        <h1>{isRegister ? "Buat toko pertama" : "Masuk ke workspace"}</h1>
        <p className="lead">
          {isRegister ? "Isi data singkat untuk mulai jualan." : "Lanjutkan ke dashboard toko kamu."}
        </p>

        {challenge ? (
          <form onSubmit={handleTwoFactor}>
            <p className="small muted" style={{ marginTop: 0 }}>
              Masukkan 6 digit kode dari aplikasi authenticator, atau kode pemulihan sekali pakai.
            </p>
            <label className="field">
              <span>Kode dua faktor</span>
              <input
                className="input"
                name="code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Memverifikasi…" : "Verifikasi & masuk"}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setChallenge(""); setError(""); }}
            >
              Kembali
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
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
        )}

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
        <p className="hint" style={{ marginTop: 8 }}><Link href="/">← Kembali ke beranda</Link></p>
      </section>
    </main>
  );
}
