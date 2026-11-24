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
}: {
  name: string;
  email: string;
  sessions: Session[];
  currentId: number | null;
  emailVerifiedAt: Date | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

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
            <h2 style={{ fontSize: 18, margin: 0 }}>Verifikasi email</h2>
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

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Ganti password</h2>
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
          <h2 style={{ fontSize: 18 }}>Perangkat aktif ({sessions.length})</h2>
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
