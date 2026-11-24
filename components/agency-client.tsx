"use client";

import { useState } from "react";
import type { AgencySummary } from "@/lib/agency";
import { rupiah } from "@/lib/format";

type CodeRow = {
  id: number;
  code: string;
  commissionBps: number;
  active: boolean;
  createdAt: Date;
  _count: { referrals: number };
};

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };

export function AgencyClient({
  summary,
  codes,
  appUrl,
}: {
  summary: AgencySummary;
  codes: CodeRow[];
  appUrl: string;
}) {
  const [items, setItems] = useState(codes);
  const [commission, setCommission] = useState("15");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  async function createCode() {
    setError("");
    setSaving(true);
    try {
      const bps = Math.round(Number(commission) * 100);
      const res = await fetch("/api/agency/referrals", {
        method: "POST",
        headers,
        body: JSON.stringify({ commissionBps: bps }),
      });
      const data = (await res.json()) as { error?: string; code?: { id: number; code: string; commissionBps: number } };
      if (!res.ok || !data.code) throw new Error(data.error ?? "Gagal membuat kode.");
      setItems((current) => [
        {
          ...data.code!,
          active: true,
          createdAt: new Date(),
          _count: { referrals: 0 },
        },
        ...current,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kode.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(code: string) {
    const link = `${appUrl}/register?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
    } catch {
      setError("Browser tidak mengizinkan akses clipboard. Salin manual: " + link);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard agensi</h1>
          <p>Penjualan dan komisi dari seluruh toko klien kamu.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}

      <div className="grid grid-3">
        <div className="card stat">
          <div className="label">Toko klien</div>
          <div className="value">{summary.tenantCount}</div>
          <div className="sub">{summary.conversions} referral aktif</div>
        </div>
        <div className="card stat">
          <div className="label">Penjualan bulan ini</div>
          <div className="value">{rupiah(summary.salesThisMonth)}</div>
          <div className="sub">Gabungan semua klien</div>
        </div>
        <div className="card stat">
          <div className="label">Estimasi komisi</div>
          <div className="value" style={{ color: "var(--brand)" }}>{rupiah(summary.commissionThisMonth)}</div>
          <div className="sub">Dihitung dari penjualan klien</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Kode referral</h2>
          <div className="toolbar">
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Komisi (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={30}
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                style={{ width: 100 }}
              />
            </label>
            <button className="btn btn-primary" type="button" onClick={createCode} disabled={saving}>
              {saving ? "Membuat…" : "Buat kode"}
            </button>
          </div>
          {items.length === 0 ? (
            <p className="empty">Belum ada kode referral.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th className="num">Komisi</th>
                  <th className="num">Klien</th>
                  <th className="right"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.code}</strong></td>
                    <td className="num">{item.commissionBps / 100}%</td>
                    <td className="num">{item._count.referrals}</td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyLink(item.code)}>
                        {copied === item.code ? "Tersalin ✓" : "Salin link"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted" style={{ marginTop: 14 }}>
            Link pendaftaran otomatis mengisi kode referral. Klien yang daftar akan otomatis masuk ke dashboard kamu.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 18 }}>Klien & komisi</h2>
          {summary.tenants.length === 0 ? (
            <p className="empty">Belum ada toko klien. Bagikan kode referral dulu.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Toko</th>
                  <th className="num">Penjualan</th>
                  <th className="num">Komisi</th>
                </tr>
              </thead>
              <tbody>
                {summary.tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div>{tenant.name}</div>
                      <span className="badge badge-neutral">{tenant.plan}</span>
                    </td>
                    <td className="num">{rupiah(tenant.sales)}</td>
                    <td className="num" style={{ color: "var(--brand)" }}>{rupiah(tenant.commission)}</td>
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
