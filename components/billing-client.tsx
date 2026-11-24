"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@prisma/client";
import { PAID_PLANS, PLAN_LIMITS, priceFor } from "@/lib/plans";
import { rupiah } from "@/lib/format";

type PaymentRow = {
  id: number;
  amount: number;
  plan: Plan;
  status: string;
  proof: string | null;
  periodEnd: Date;
  createdAt: Date;
  reviewedAt: Date | null;
};

const statusBadge: Record<string, string> = {
  PENDING: "badge-warn",
  PAID: "badge-ok",
  REJECTED: "badge-neutral",
};

export function BillingClient({
  plan,
  outletCount,
  payments,
}: {
  plan: Plan;
  outletCount: number;
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<"PRO" | "AGENCY">("PRO");
  const [proof, setProof] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [snap, setSnap] = useState<{ token: string; orderId: string; amount: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const limits = PLAN_LIMITS[plan];
  const amount = priceFor(selected, outletCount);

  async function requestUpgrade() {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const res = await fetch("/api/billing/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" },
        body: JSON.stringify({ plan: selected, proof: proof || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal mengajukan pembayaran.");
      setProof("");
      setNotice("Pengajuan terkirim. Transfer sesuai nominal, lalu tunggu verifikasi admin.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan pembayaran.");
    } finally {
      setSaving(false);
    }
  }

  async function payWithMidtrans() {
    setError("");
    setNotice("");
    setPaying(true);
    try {
      const res = await fetch("/api/billing/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = (await res.json()) as { error?: string; token?: string; orderId?: string; amount?: number };
      if (!res.ok || !data.token || !data.orderId) {
        throw new Error(data.error ?? "Gagal membuat pembayaran.");
      }
      setSnap({ token: data.token, orderId: data.orderId, amount: data.amount ?? amount });
      setNotice("Jendela pembayaran dibuka. Selesaikan pembayaran; status akan diperbarui otomatis.");
      window.open(`https://app.sandbox.midtrans.com/snap/v2/embed/${data.token}`, "_blank", "noopener,noreferrer");

      // Webhook adalah sumber kebenaran; polling hanya untuk menyegarkan tampilan.
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 4000));
        const check = await fetch("/api/billing/payments", { cache: "no-store" });
        const payload = (await check.json()) as {
          payments: Array<{ amount: number; status: string }>;
        };
        if (payload.payments.some((item) => item.status === "PAID" && item.amount === data.amount)) {
          setSnap(null);
          setNotice("Pembayaran diterima. Paket kamu sudah aktif.");
          router.refresh();
          return;
        }
      }
      setNotice("Pembayaran belum terdeteksi. Cek tagihan beberapa saat lagi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulai pembayaran.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tagihan & paket</h1>
          <p>Lihat batas paket dan ajukan upgrade.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ fontSize: 18 }}>Paket saat ini: {plan}</h2>
          <table>
            <tbody>
              <tr><td>Outlet</td><td className="num">{limits.outlets}</td></tr>
              <tr><td>Produk aktif</td><td className="num">{limits.products}</td></tr>
              <tr><td>Transaksi / bulan</td><td className="num">{limits.salesPerMonth}</td></tr>
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 12 }}>
            Sedang dipakai {outletCount} outlet. Tagihan PRO dihitung per outlet.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 18 }}>Ajukan upgrade</h2>
          <label className="field">
            <span>Paket</span>
            <select className="input" value={selected} onChange={(event) => setSelected(event.target.value as "PRO" | "AGENCY")}>
              <option value="PRO">Pro — {rupiah(PAID_PLANS.PRO)} / outlet / bulan</option>
              <option value="AGENCY">Agency — {rupiah(PAID_PLANS.AGENCY)} / bulan</option>
            </select>
          </label>
          <label className="field">
            <span>Catatan / bukti transfer (opsional)</span>
            <input
              className="input"
              value={proof}
              onChange={(event) => setProof(event.target.value)}
              placeholder="Mis. transfer BCA 24 Nov 2026"
            />
          </label>
          <div className="total-line">
            <span>Total bayar</span>
            <span>{rupiah(amount)}</span>
          </div>
          <button className="btn btn-primary" type="button" onClick={requestUpgrade} disabled={saving || paying} style={{ width: "100%" }}>
            {saving ? "Mengirim…" : "Kirim pengajuan transfer"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={payWithMidtrans} disabled={saving || paying} style={{ width: "100%", marginTop: 8 }}>
            {paying ? "Menyiapkan pembayaran…" : "Bayar otomatis (Midtrans)"}
          </button>
          {snap ? (
            <p className="small muted" style={{ marginBottom: 0 }}>
              Order <strong>{snap.orderId}</strong> · {rupiah(snap.amount)}. Jangan tutup halaman ini sampai lunas.
            </p>
          ) : null}
          <p className="small muted" style={{ marginBottom: 0 }}>
            Midtrans menerima kartu, VA, dan QRIS. Transfer manual tetap tersedia tanpa biaya gateway.
          </p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18 }}>Riwayat pembayaran</h2>
        {payments.length === 0 ? (
          <p className="empty">Belum ada pengajuan.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Paket</th>
                <th className="num">Nominal</th>
                <th>Status</th>
                <th className="right">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.plan}</td>
                  <td className="num">{rupiah(payment.amount)}</td>
                  <td><span className={`badge ${statusBadge[payment.status] ?? "badge-neutral"}`}>{payment.status}</span></td>
                  <td className="right small muted">{new Date(payment.createdAt).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
