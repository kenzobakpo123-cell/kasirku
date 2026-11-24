"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@prisma/client";
import { rupiah } from "@/lib/format";

type PaymentRow = {
  id: number;
  amount: number;
  plan: Plan;
  status: string;
  proof: string | null;
  createdAt: Date;
  tenant: { id: number; name: string };
};

export function AdminClient({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function review(paymentId: number, action: "PAID" | "REJECTED") {
    setError("");
    setBusy(paymentId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal memproses pembayaran.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Verifikasi pembayaran</h1>
          <p>Setujui pengajuan upgrade paket dari toko.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}

      <section className="card">
        {payments.length === 0 ? (
          <p className="empty">Tidak ada pembayaran.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Toko</th>
                <th>Paket</th>
                <th className="num">Nominal</th>
                <th>Status</th>
                <th className="right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div>{payment.tenant.name}</div>
                    <div className="small muted">{new Date(payment.createdAt).toLocaleDateString("id-ID")}</div>
                  </td>
                  <td>{payment.plan}</td>
                  <td className="num">{rupiah(payment.amount)}</td>
                  <td>
                    <span className={`badge ${payment.status === "PAID" ? "badge-ok" : payment.status === "PENDING" ? "badge-warn" : "badge-neutral"}`}>
                      {payment.status}
                    </span>
                    {payment.proof ? <div className="small muted">{payment.proof}</div> : null}
                  </td>
                  <td className="right">
                    {payment.status === "PENDING" ? (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          disabled={busy === payment.id}
                          onClick={() => review(payment.id, "PAID")}
                        >
                          Setujui
                        </button>{" "}
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          disabled={busy === payment.id}
                          onClick={() => review(payment.id, "REJECTED")}
                        >
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span className="small muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
