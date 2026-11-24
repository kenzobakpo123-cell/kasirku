"use client";

import { useCallback, useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

type Product = {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
};

type Form = { name: string; sku: string; price: string; cost: string; stock: string; minStock: string };

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };
const emptyForm: Form = { name: "", sku: "", price: "", cost: "", stock: "", minStock: "0" };

function formFrom(product: Product): Form {
  return {
    name: product.name,
    sku: product.sku ?? "",
    price: String(product.price),
    cost: String(product.cost),
    stock: String(product.stock),
    minStock: String(product.minStock),
  };
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products", { headers });
  const data = (await res.json()) as { products?: Product[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Gagal memuat produk.");
  return data.products ?? [];
}

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat produk.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat produk."))
      .finally(() => setLoading(false));
  }, []);

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(product: Product) {
    setError("");
    setNotice("");
    setEditing(product);
    setForm(formFrom(product));
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      price: Number(form.price),
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
    };
    try {
      const res = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; product?: Product };
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan produk.");
      setNotice(editing ? `${data.product?.name ?? "Produk"} diperbarui.` : `${data.product?.name ?? "Produk"} ditambahkan.`);
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  }

  async function restock(product: Product) {
    const raw = window.prompt(`Tambah stok ${product.name} berapa?`, "10");
    if (!raw) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta <= 0) {
      setError("Jumlah stok harus bilangan bulat positif.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stock: product.stock + delta }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menambah stok.");
      setNotice(`${delta} stok ${product.name} ditambahkan. Riwayat mutasi tercatat.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah stok.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Nonaktifkan ${product.name}?`)) return;
    setError("");
    const res = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Gagal menonaktifkan produk.");
      return;
    }
    setNotice(`${product.name} dinonaktifkan.`);
    if (editing?.id === product.id) cancelEdit();
    await load();
  }

  async function importCsv() {
    setError("");
    setNotice("");
    setImporting(true);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers,
        body: JSON.stringify({ csv: csvText }),
      });
      const data = (await res.json()) as {
        error?: string;
        details?: string[];
        imported?: number;
      };
      if (!res.ok) {
        const detail = data.details?.slice(0, 3).join(" · ");
        throw new Error(detail ? `${data.error ?? "CSV invalid"} — ${detail}` : data.error ?? "Gagal import.");
      }
      setNotice(`${data.imported ?? 0} produk berhasil diimpor.`);
      setCsvText("");
      setShowImport(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal import CSV.");
    } finally {
      setImporting(false);
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setCsvText(await file.text());
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Produk</h1>
          <p>Kelola harga dan stok yang dipakai kasir.</p>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      <div className="grid grid-2">
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">{editing ? `Ubah: ${editing.name}` : "Tambah produk"}</h2>
            {editing ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={cancelEdit}>Batal</button>
            ) : null}
          </div>
          <form onSubmit={saveProduct}>
            <label className="field">
              <span>Nama produk</span>
              <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
            </label>
            <label className="field">
              <span>SKU (opsional)</span>
              <input className="input" value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="Bisa dipakai scanner barcode" />
            </label>
            <div className="grid grid-2">
              <label className="field">
                <span>Harga jual (Rp)</span>
                <input className="input" type="number" min={1} required value={form.price} onChange={(e) => update("price", e.target.value)} />
              </label>
              <label className="field">
                <span>Modal (Rp)</span>
                <input className="input" type="number" min={0} value={form.cost} onChange={(e) => update("cost", e.target.value)} />
              </label>
              <label className="field">
                <span>{editing ? "Stok saat ini" : "Stok awal"}</span>
                <input className="input" type="number" min={0} value={form.stock} onChange={(e) => update("stock", e.target.value)} />
              </label>
              <label className="field">
                <span>Stok minimum</span>
                <input className="input" type="number" min={0} value={form.minStock} onChange={(e) => update("minStock", e.target.value)} />
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
              {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan produk"}
            </button>
          </form>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowImport((value) => !value)}>
              {showImport ? "Tutup import CSV" : "📥 Import dari CSV"}
            </button>
            {showImport ? (
              <div style={{ marginTop: 12 }}>
                <p className="small muted" style={{ marginTop: 0 }}>
                  Header: Nama, SKU, Harga, Modal, Stok, Stok Minimum. Maksimal 500 baris.
                </p>
                <div className="toolbar">
                  <input
                    className="input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => pickFile(event.target.files?.[0])}
                  />
                  <a className="btn btn-ghost btn-sm" href="/contoh-produk.csv" download>Contoh CSV</a>
                </div>
                <textarea
                  className="input"
                  rows={5}
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  placeholder={"Nama,SKU,Harga,Modal,Stok,Stok Minimum\nKopi Latte,KL-1,22000,8000,30,10"}
                />
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  disabled={importing || csvText.trim() === ""}
                  onClick={importCsv}
                  style={{ marginTop: 8 }}
                >
                  {importing ? "Mengimpor…" : "Import produk"}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="card">
          <h2 className="section-title">Daftar produk ({products.length})</h2>
          {loading ? (
            <p className="empty">Memuat…</p>
          ) : products.length === 0 ? (
            <p className="empty">Belum ada produk. Tambahkan di sebelah kiri.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="num">Harga</th>
                  <th className="num">Stok</th>
                  <th className="right"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div>{product.name}</div>
                      <div className="small muted">{product.sku ?? "—"}</div>
                    </td>
                    <td className="num">{rupiah(product.price)}</td>
                    <td className="num">
                      <span className={`badge ${product.stock <= product.minStock ? "badge-warn" : "badge-ok"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="right" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-ghost btn-sm" type="button" disabled={saving} onClick={() => restock(product)}>
                        + Stok
                      </button>{" "}
                      {product.sku ? (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`/api/products/${product.id}/barcode`}
                          target="_blank"
                          rel="noreferrer"
                          title={`Cetak label barcode ${product.sku}`}
                        >
                          Label
                        </a>
                      ) : null}{" "}
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEdit(product)}>
                        Ubah
                      </button>{" "}
                      <button className="btn btn-ghost btn-sm" type="button" disabled={saving} onClick={() => removeProduct(product)}>
                        Nonaktifkan
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
