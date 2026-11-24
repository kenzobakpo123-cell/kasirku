"use client";

import { useCallback, useEffect, useState } from "react";
import { dateTime, rupiah } from "@/lib/format";

type Customer = {
  id: number;
  name: string;
  email: string;
  note: string | null;
  createdAt: string;
  salesCount: number;
  totalSpent: number;
  lastVisit: string | null;
};

type Form = { name: string; email: string; note: string };

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };
const emptyForm: Form = { name: "", email: "", note: "" };

function formFrom(customer: Customer): Form {
  return {
    name: customer.name,
    email: customer.email,
    note: customer.note ?? "",
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MembersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (search: string) => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/customers?${params.toString()}`, { headers, cache: "no-store" });
      const data = (await res.json()) as { customers?: Customer[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat member.");
      setCustomers(data.customers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat member.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), 200);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(customer: Customer) {
    setError("");
    setNotice("");
    setEditing(customer);
    setForm(formFrom(customer));
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          note: form.note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Member gagal disimpan.");
      setNotice(editing ? "Member berhasil diperbarui." : "Member berhasil ditambahkan.");
      cancelEdit();
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Member gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomer(customer: Customer) {
    if (!window.confirm(`Hapus member ${customer.name}? Riwayat transaksinya tetap tersimpan.`)) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE", headers });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Member gagal dihapus.");
      setNotice("Member berhasil dihapus. Riwayat transaksi tetap tersimpan.");
      if (editing?.id === customer.id) cancelEdit();
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Member gagal dihapus.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Member</h1>
          <p>Pembeli tersimpan otomatis lewat email saat transaksi. Cari dan lihat riwayatnya di sini.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      <div className="grid grid-2">
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">{editing ? `Ubah: ${editing.name}` : "Tambah member"}</h2>
            {editing ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={cancelEdit}>Batal</button>
            ) : null}
          </div>
          <form onSubmit={saveCustomer}>
            <label className="field">
              <span>Nama member</span>
              <input
                className="input"
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Nama pembeli"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="nama@email.com"
              />
            </label>
            <label className="field">
              <span>Catatan (opsional)</span>
              <input
                className="input"
                value={form.note}
                onChange={(event) => update("note", event.target.value)}
                placeholder="Misalnya: langganan tiap Jumat"
              />
            </label>
            <p className="small muted">
              Email dipakai sebagai identitas unik per toko. Struk dikirim ke email ini setelah pembayaran.
            </p>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
              {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan member"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="section-title">Daftar member ({customers.length})</h2>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <input
              className="input grow"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau email…"
              style={{ marginBottom: 0 }}
            />
          </div>
          {loading ? (
            <p className="empty">Memuat…</p>
          ) : customers.length === 0 ? (
            <p className="empty">
              {query ? "Tidak ada member yang cocok." : "Belum ada member. Member otomatis dibuat saat kasir memasukkan email pembeli."}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="num">Belanja</th>
                  <th className="num">Transaksi</th>
                  <th className="right"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="product-cell">
                        <span className="thumb thumb-empty" aria-hidden="true">{initials(customer.name)}</span>
                        <div>
                          <div>{customer.name}</div>
                          <div className="small muted">{customer.email}</div>
                          {customer.note ? <div className="small muted">{customer.note}</div> : null}
                          {customer.lastVisit ? (
                            <div className="small muted">Terakhir {dateTime(new Date(customer.lastVisit))}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="num">{rupiah(customer.totalSpent)}</td>
                    <td className="num">
                      <span className="badge badge-neutral">{customer.salesCount}</span>
                    </td>
                    <td className="right" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEdit(customer)}>
                        Ubah
                      </button>{" "}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => void removeCustomer(customer)}>
                        Hapus
                      </button>
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
