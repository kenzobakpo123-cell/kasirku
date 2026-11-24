"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dateTime } from "@/lib/format";

type Session = {
  id: number;
  label: string;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
};

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };

export function AccountClient({
  name,
  email,
  sessions,
  currentId,
  emailVerifiedAt,
  twoFactorEnabled,
}: {
  name: string;
  email: string;
  sessions: Session[];
  currentId: number | null;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorUri, setTwoFactorUri] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (next !== confirm) {
      setError("Password baru dan konfirmasi tidak sama.");
      return;
    }
    setBusy("password");
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as { error?: string; revokedOthers?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Gagal mengganti password.");
      setNotice("Password diperbarui. Perangkat lain telah dicabut.");
      setCurrent("");
      setNext("");
      setConfirm("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setBusy("");
    }
  }

  async function resendVerification() {
    setError("");
    setNotice("");
    setBusy("verify");
    try {
      const res = await fetch("/api/auth/verify-email/request", { method: "POST", headers });
      const data = (await res.json()) as { error?: string; devUrl?: string; alreadyVerified?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim email.");
      setNotice(data.devUrl ? `Mode development — link: ${data.devUrl}` : data.alreadyVerified ? "Email sudah terverifikasi." : "Link verifikasi dikirim ke email kamu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email.");
    } finally {
      setBusy("");
    }
  }

  async function revoke(session: Session) {
    if (!window.confirm(`Cabut akses perangkat ${session.label}?`)) return;
    setError("");
    setBusy(`session-${session.id}`);
    try {
      const res = await fetch("/api/account/sessions", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal mencabut perangkat.");
      setNotice(`${session.label} telah dicabut.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencabut perangkat.");
    } finally {
      setBusy("");
    }
  }

  async function startTwoFactor() {
    setError("");
    setNotice("");
    setBusy("2fa-setup");
    try {
      const res = await fetch("/api/account/two-factor/setup", { method: "POST", headers });
      const data = (await res.json()) as { error?: string; secret?: string; uri?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menyiapkan dua faktor.");
      setTwoFactorSecret(data.secret ?? "");
      setTwoFactorUri(data.uri ?? "");
      setRecoveryCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyiapkan dua faktor.");
    } finally {
      setBusy("");
    }
  }

  async function enableTwoFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy("2fa-enable");
    try {
      const res = await fetch("/api/account/two-factor/enable", {
        method: "POST",
        headers,
        body: JSON.stringify({ code: twoFactorCode }),
      });
      const data = (await res.json()) as { error?: string; recoveryCode?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal mengaktifkan dua faktor.");
      setRecoveryCode(data.recoveryCode ?? "");
      setTwoFactorSecret("");
      setTwoFactorUri("");
      setTwoFactorCode("");
      setNotice("Dua faktor aktif. Simpan kode pemulihan di tempat aman.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan dua faktor.");
    } finally {
      setBusy("");
    }
  }

  async function disableTwoFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy("2fa-disable");
    try {
      const res = await fetch("/api/account/two-factor/disable", {
        method: "POST",
        headers,
        body: JSON.stringify({ code: twoFactorCode, password: disablePassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menonaktifkan dua faktor.");
      setTwoFactorCode("");
      setDisablePassword("");
      setRecoveryCode("");
      setNotice("Verifikasi dua faktor dinonaktifkan.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menonaktifkan dua faktor.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Akun & keamanan</h1>
          <p>{name} · {email}</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      <section className="card" id="verifikasi" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 className="section-title">Verifikasi email</h2>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              {emailVerifiedAt ? "Email kamu sudah terverifikasi." : `Belum terverifikasi untuk ${email}.`}
            </p>
          </div>
          {!emailVerifiedAt ? (
            <button className="btn btn-ghost btn-sm" type="button" disabled={busy !== ""} onClick={resendVerification}>
              {busy === "verify" ? "Mengirim…" : "Kirim ulang link"}
            </button>
          ) : (
            <span className="badge badge-ok">Terverifikasi</span>
          )}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2 className="section-title">Verifikasi dua faktor</h2>
        {twoFactorEnabled ? (
          <>
            <p className="small muted" style={{ marginTop: 4 }}>
              Akun dilindungi kode 6 digit dari aplikasi authenticator.
            </p>
            {recoveryCode ? (
              <p className="small" style={{ color: "var(--ok)" }}>
                Simpan kode pemulihan sekali pakai: <strong>{recoveryCode}</strong>
              </p>
            ) : null}
            <form onSubmit={disableTwoFactor}>
              <label className="field">
                <span>Kode authenticator atau kode pemulihan</span>
                <input
                  className="input"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  autoComplete="one-time-code"
                />
              </label>
              <label className="field">
                <span>Password akun</span>
                <input
                  className="input"
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button className="btn btn-ghost btn-sm" type="submit" disabled={busy !== ""}>
                {busy === "2fa-disable" ? "Memproses…" : "Nonaktifkan dua faktor"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="small muted" style={{ marginTop: 4 }}>
              Tambahkan lapisan keamanan dengan kode 6 digit dari aplikasi authenticator.
            </p>
            {twoFactorSecret ? (
              <>
                <p className="small">
                  Secret: <code>{twoFactorSecret}</code>
                </p>
                {twoFactorUri ? (
                  <p className="small">
                    <a href={twoFactorUri}>Buka di aplikasi authenticator</a>
                  </p>
                ) : null}
                <form onSubmit={enableTwoFactor}>
                  <label className="field">
                    <span>Kode 6 digit dari aplikasi</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      autoComplete="one-time-code"
                    />
                  </label>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={busy !== ""}>
                    {busy === "2fa-enable" ? "Memverifikasi…" : "Aktifkan dua faktor"}
                  </button>
                </form>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" type="button" disabled={busy !== ""} onClick={startTwoFactor}>
                {busy === "2fa-setup" ? "Menyiapkan…" : "Siapkan dua faktor"}
              </button>
            )}
          </>
        )}
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="section-title">Ganti password</h2>
          <form onSubmit={changePassword}>
            <label className="field">
              <span>Password saat ini</span>
              <input className="input" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </label>
            <label className="field">
              <span>Password baru</span>
              <input className="input" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Konfirmasi password baru</span>
              <input className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy !== ""} style={{ width: "100%" }}>
              {busy === "password" ? "Menyimpan…" : "Perbarui password"}
            </button>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Mengganti password otomatis mencabut sesi di perangkat lain.
            </p>
          </form>
        </section>

        <section className="card">
          <h2 className="section-title">Perangkat aktif ({sessions.length})</h2>
          {sessions.length === 0 ? (
            <p className="empty">Tidak ada sesi aktif.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Perangkat</th><th className="right">Terakhir dipakai</th><th className="right"></th></tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div>{session.label}</div>
                      <div className="small muted">{session.ip ?? "IP tidak tercatat"}</div>
                    </td>
                    <td className="right small muted">{dateTime(session.lastUsedAt)}</td>
                    <td className="right">
                      {session.id === currentId ? (
                        <span className="badge badge-ok">Ini</span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          disabled={busy !== ""}
                          onClick={() => revoke(session)}
                        >
                          Cabut
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
