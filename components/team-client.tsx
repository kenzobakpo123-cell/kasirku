"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { ASSIGNABLE_ROLES, canAssign, canRemove, roleLabel, type AssignableRole } from "@/lib/members";

type Member = {
  userId: number;
  role: Role;
  createdAt: Date;
  user: { id: number; name: string; email: string };
};

type Outlet = { id: number; name: string; address: string | null };

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };

export function TeamClient({
  members,
  viewerId,
  outlets,
  actorRole,
}: {
  members: Member[];
  viewerId: number;
  outlets: Outlet[];
  actorRole: Role;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("CASHIER");
  const [outletName, setOutletName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const allowedRoles = ASSIGNABLE_ROLES.filter((item) => canAssign(actorRole, item));

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy("member");
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers,
        body: JSON.stringify({ email, role }),
      });
      const data = (await res.json()) as { error?: string; name?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menambah anggota.");
      setNotice(`${data.name ?? "Anggota"} ditambahkan sebagai ${roleLabel(role)}.`);
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah anggota.");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`Hapus akses ${member.user.name}?`)) return;
    setError("");
    setBusy(`remove-${member.userId}`);
    try {
      const res = await fetch("/api/members", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ userId: member.userId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus anggota.");
      setNotice(`${member.user.name} tidak lagi punya akses.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus anggota.");
    } finally {
      setBusy("");
    }
  }

  async function addOutlet(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy("outlet");
    try {
      const res = await fetch("/api/outlets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: outletName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menambah outlet.");
      setNotice(`Outlet ${outletName} dibuat.`);
      setOutletName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah outlet.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tim & outlet</h1>
          <p>Atur siapa yang bisa mengakses toko dan outlet yang tersedia.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Anggota tim ({members.length})</h2>
          {allowedRoles.length > 0 ? (
            <form onSubmit={addMember} style={{ marginBottom: 18 }}>
              <label className="field">
                <span>Email pengguna</span>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="kasir@domain.com"
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select className="input" value={role} onChange={(event) => setRole(event.target.value as AssignableRole)}>
                  {allowedRoles.map((item) => (
                    <option key={item} value={item}>{roleLabel(item)}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy === "member"} style={{ width: "100%" }}>
                {busy === "member" ? "Menambah…" : "Tambah anggota"}
              </button>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Pengguna harus sudah punya akun. Bagikan kode referral agar klien/agensi ikut terhubung.
              </p>
            </form>
          ) : (
            <p className="notice">Role kamu tidak bisa menambah anggota.</p>
          )}

          <table>
            <thead>
              <tr><th>Nama</th><th>Role</th><th className="right"></th></tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const removable = canRemove(
                  actorRole,
                  member.role,
                  member.userId === viewerId,
                );
                return (
                  <tr key={member.userId}>
                    <td>
                      <div>{member.user.name}</div>
                      <div className="small muted">{member.user.email}</div>
                    </td>
                    <td><span className="badge badge-neutral">{roleLabel(member.role)}</span></td>
                    <td className="right">
                      {removable ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          disabled={busy !== ""}
                          onClick={() => removeMember(member)}
                        >
                          Hapus
                        </button>
                      ) : (
                        <span className="small muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 18 }}>Outlet ({outlets.length})</h2>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {outlets.map((outlet) => (
              <li key={outlet.id} style={{ marginBottom: 6 }}>
                <strong>{outlet.name}</strong>
                {outlet.address ? <span className="muted"> — {outlet.address}</span> : null}
              </li>
            ))}
          </ul>
          {canAssign(actorRole, "CASHIER") || actorRole === "OWNER" ? (
            <form onSubmit={addOutlet} style={{ marginTop: 18 }}>
              <label className="field">
                <span>Nama outlet baru</span>
                <input
                  className="input"
                  required
                  minLength={2}
                  value={outletName}
                  onChange={(event) => setOutletName(event.target.value)}
                  placeholder="Cabang Selatan"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy === "outlet"} style={{ width: "100%" }}>
                {busy === "outlet" ? "Menyimpan…" : "Tambah outlet"}
              </button>
            </form>
          ) : (
            <p className="small muted">Hubungi owner untuk menambah outlet.</p>
          )}
          <p className="small muted" style={{ marginTop: 14 }}>
            Paket Gratis hanya 1 outlet. Tambah outlet akan otomatis menaikkan tagihan PRO.
          </p>
        </section>
      </div>
    </>
  );
}
