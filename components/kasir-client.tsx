"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { rupiah } from "@/lib/format";
import { dequeueSale, enqueueSale, loadQueue } from "@/lib/offline-queue";

type Product = {
  id: number;
  name: string;
  sku: string | null;
  imageData: string | null;
  price: number;
  stock: number;
};
type Outlet = { id: number; name: string };
type Customer = { id: number; name: string; email: string; salesCount?: number };
type ReceiptLine = { name: string; qty: number; subtotal: number };
type Receipt = { id: number; number: string; total: number; paid: number; change: number; items: ReceiptLine[] };
type ReceiptDelivery = {
  skipped?: boolean;
  alreadySent?: boolean;
  emailSent: boolean;
  dev: boolean;
  errors: string[];
};
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};

const headers = { "Content-Type": "application/json", "X-Kasirku-Client": "pwa" };
const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `kk-${Date.now()}`;

async function fetchKasirData(): Promise<{ products: Product[]; outlets: Outlet[]; customers: Customer[] }> {
  const [productRes, outletRes, customerRes] = await Promise.all([
    fetch("/api/products", { headers }),
    fetch("/api/outlets", { headers }),
    fetch("/api/customers?limit=200", { headers }),
  ]);
  if (!productRes.ok || !outletRes.ok || !customerRes.ok) throw new Error("Gagal memuat data kasir.");
  const productData = (await productRes.json()) as { products: Product[] };
  const outletData = (await outletRes.json()) as { outlets: Outlet[] };
  const customerData = (await customerRes.json()) as { customers: Customer[] };
  return {
    products: productData.products,
    outlets: outletData.outlets,
    customers: customerData.customers,
  };
}

async function refreshSession(): Promise<void> {
  await fetch("/api/auth/refresh", { method: "POST", headers });
}

function barcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as unknown as {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "qr_code"] });
  } catch {
    return null;
  }
}

export function KasirClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [delivery, setDelivery] = useState<ReceiptDelivery | null>(null);
  const [resending, setResending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanStopRef = useRef<(() => void) | null>(null);
  const flushing = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchKasirData();
      setProducts(data.products);
      setOutlets(data.outlets);
      setCustomers(data.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data kasir.");
    } finally {
      setLoading(false);
    }
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const queued = loadQueue();
    if (queued.length === 0) return;

    flushing.current = true;
    setSyncing(true);
    try {
      await refreshSession();
      let synced = 0;
      for (const item of queued) {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers,
          body: JSON.stringify(item.body),
        });
        if (res.ok) {
          dequeueSale(item.key);
          synced += 1;
          continue;
        }
        // 4xx selain 401 berarti data tidak bisa disinkron ulang; buang dari antrean.
        if (res.status >= 400 && res.status < 500 && res.status !== 401) {
          dequeueSale(item.key);
        } else {
          break;
        }
      }
      setPending(loadQueue().length);
      if (synced > 0) setNotice(`${synced} transaksi offline berhasil disinkronkan.`);
    } catch {
      setError("Antrean belum bisa disinkronkan. Coba lagi saat koneksi stabil.");
    } finally {
      flushing.current = false;
      setSyncing(false);
    }
  }, []);

  function stopScan() {
    const stop = scanStopRef.current;
    scanStopRef.current = null;
    stop?.();
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  useEffect(() => {
    fetchKasirData()
      .then((data) => {
        setProducts(data.products);
        setOutlets(data.outlets);
        setCustomers(data.customers);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data kasir."))
      .finally(() => setLoading(false));

    Promise.resolve().then(() => setPending(loadQueue().length));
    const onOnline = () => {
      void flush();
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      scanStopRef.current?.();
      scanStopRef.current = null;
    };
  }, [flush]);

  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) || (product.sku ?? "").toLowerCase().includes(needle),
    );
  }, [products, query]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([rawId, qty]) => {
          const product = byId.get(Number(rawId));
          return product ? { product, qty } : null;
        })
        .filter((line): line is { product: Product; qty: number } => line !== null && line.qty > 0),
    [cart, byId],
  );

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discountValue = Number(discount || 0);
  const total = Math.max(0, subtotal - discountValue);
  const paidValue = Number(paid || 0);
  const change = paidValue - total;
  const selectedEmail = customerEmail.trim().toLowerCase();
  const selectedMember = customers.find((customer) => customer.email.toLowerCase() === selectedEmail);

  function pickCustomerEmail(value: string) {
    setCustomerEmail(value);
    const match = customers.find((customer) => customer.email.toLowerCase() === value.trim().toLowerCase());
    if (match) setCustomerName(match.name);
  }

  function add(product: Product) {
    setError("");
    const current = cart[product.id] ?? 0;
    if (current >= product.stock) {
      setError(`Stok ${product.name} hanya ${product.stock}.`);
      return;
    }
    setCart((state) => ({ ...state, [product.id]: current + 1 }));
  }

  function handleScannedCode(rawValue: string) {
    const raw = rawValue.trim();
    if (!raw) return;

    const match = products.find(
      (product) => (product.sku ?? "").toUpperCase() === raw.toUpperCase() || String(product.id) === raw,
    );
    setQuery(raw);
    if (match) {
      setError("");
      add(match);
    } else {
      setError(`Barcode ${raw} belum terdaftar sebagai SKU produk.`);
    }
    stopScan();
  }

  async function startScan() {
    setScanError("");
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Kamera tidak tersedia. Gunakan input SKU manual.");
      return;
    }

    const detector = barcodeDetector();
    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    };

    try {
      setScanning(true);
      const video = videoRef.current;
      if (!video) throw new Error("Video scanner belum siap.");

      if (detector) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();

        let frame = 0;
        let stopped = false;
        const tick = async () => {
          if (stopped || !video.srcObject) return;
          try {
            const codes = await detector.detect(video);
            const raw = codes[0]?.rawValue;
            if (raw) {
              handleScannedCode(raw);
              return;
            }
          } catch {
            // Frame kadang gagal saat kamera masih fokus; lanjutkan frame berikutnya.
          }
          frame = requestAnimationFrame(() => void tick());
        };
        scanStopRef.current = () => {
          stopped = true;
          if (frame) cancelAnimationFrame(frame);
          stream.getTracks().forEach((track) => track.stop());
        };
        frame = requestAnimationFrame(() => void tick());
        return;
      }

      // Fallback lintas browser: ZXing dimuat hanya saat scanner dipakai.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(constraints, video, (result) => {
        if (result) handleScannedCode(result.getText());
      });
      scanStopRef.current = () => controls.stop();
    } catch {
      stopScan();
      setScanError("Akses kamera ditolak atau scanner gagal dipasang. Gunakan input SKU manual.");
    }
  }

  function changeQty(productId: number, delta: number) {
    setCart((state) => {
      const next = (state[productId] ?? 0) + delta;
      const product = byId.get(productId);
      if (next <= 0) {
        const copy = { ...state };
        delete copy[productId];
        return copy;
      }
      if (product && next > product.stock) return state;
      return { ...state, [productId]: next };
    });
  }

  function clearCart() {
    setCart({});
    setDiscount("0");
    setPaid("");
    setCustomerName("");
    setCustomerEmail("");
    setIdempotencyKey(newKey());
  }

  async function checkout() {
    setError("");
    setNotice("");
    if (lines.length === 0) {
      setError("Keranjang masih kosong.");
      return;
    }
    if (outlets.length === 0) {
      setError("Toko belum punya outlet. Hubungi owner.");
      return;
    }
    if (paidValue < total) {
      setError(`Pembayaran kurang ${rupiah(total - paidValue)}.`);
      return;
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      setError("Nama dan email pembeli wajib diisi untuk member dan pengiriman struk.");
      return;
    }

    const body = {
      outletId: outlets[0].id,
      items: lines.map((line) => ({ productId: line.product.id, qty: line.qty })),
      discount: discountValue,
      paid: paidValue,
      method: "CASH",
      idempotencyKey,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      receiptChannel: "EMAIL",
    };

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        sale?: Omit<Receipt, "items">;
        receiptDelivery?: ReceiptDelivery;
      };
      if (!res.ok || !data.sale) throw new Error(data.error ?? "Transaksi gagal.");

      setDelivery(data.receiptDelivery ?? null);
      setReceipt({
        ...data.sale,
        items: lines.map((line) => ({
          name: line.product.name,
          qty: line.qty,
          subtotal: line.product.price * line.qty,
        })),
      });
      clearCart();
      await load();
    } catch (err) {
      if (err instanceof TypeError) {
        // Jaringan mati: simpan antrean dengan idempotencyKey yang sama.
        setPending(enqueueSale({ key: idempotencyKey, body, createdAt: Date.now() }).length);
        setNotice("Transaksi tersimpan di antrean offline. Akan otomatis disinkron saat koneksi kembali.");
        clearCart();
      } else {
        setError(err instanceof Error ? err.message : "Transaksi gagal.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function resendReceipt() {
    if (!receipt) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch(`/api/sales/${receipt.id}/resend`, { method: "POST", headers });
      const data = (await res.json()) as { error?: string; receiptDelivery?: ReceiptDelivery };
      if (!res.ok) throw new Error(data.error ?? "Struk gagal dikirim ulang.");
      setDelivery(data.receiptDelivery ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Struk gagal dikirim ulang.");
    } finally {
      setResending(false);
    }
  }

  function deliveryNote(): string {
    if (!delivery) return "";
    if (delivery.errors.length) return `Transaksi berhasil, tapi struk belum terkirim: ${delivery.errors.join(" · ")}`;
    if (delivery.alreadySent) return "Struk sudah dikirim sebelumnya.";
    if (delivery.emailSent) return "Struk otomatis terkirim ke email pembeli.";
    if (delivery.dev) {
      return "Mode demo: isi struk tercatat di log server. Isi RESEND_API_KEY untuk mengirim sungguhan.";
    }
    return "";
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kasir</h1>
          <p>{outlets[0]?.name ?? "Toko"} · pilih produk, lalu bayar.</p>
        </div>
        {pending > 0 || syncing ? (
          <button className="btn btn-ghost btn-sm" type="button" disabled={syncing} onClick={() => void flush()}>
            {syncing ? "Menyinkron…" : `Sinkron ${pending} antrean`}
          </button>
        ) : null}
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <p className="small" style={{ color: "var(--ok)" }}>{notice}</p> : null}

      {receipt ? (
        <div className="card receipt-print" style={{ marginBottom: 18, borderColor: "var(--ok)" }}>
          <h2 className="section-title">Transaksi berhasil</h2>
          <p className="small muted">{receipt.number}</p>
          {receipt.items.map((item) => (
            <div className="cart-row" key={item.name}>
              <span>{item.qty}× {item.name}</span>
              <span>{rupiah(item.subtotal)}</span>
            </div>
          ))}
          <div className="total-line">
            <span>Total</span>
            <span>{rupiah(receipt.total)}</span>
          </div>
          <p className="small">Dibayar {rupiah(receipt.paid)} · Kembalian <strong>{rupiah(receipt.change)}</strong></p>
          {deliveryNote() ? (
            <p className="small" style={{ color: delivery?.errors.length ? "var(--warn)" : "var(--ok)" }}>
              {deliveryNote()}
            </p>
          ) : null}
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn btn-ghost btn-sm no-print" type="button" onClick={() => window.print()}>
              Cetak struk
            </button>
            {delivery && !delivery.skipped ? (
              <button
                className="btn btn-ghost btn-sm no-print"
                type="button"
                disabled={resending}
                onClick={() => void resendReceipt()}
              >
                {resending ? "Mengirim…" : "Kirim ulang struk"}
              </button>
            ) : null}
            <button className="btn btn-ghost btn-sm no-print" type="button" onClick={() => setReceipt(null)}>
              Tutup
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-2">
        <section className="card">
          <h2 className="section-title">Produk</h2>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="Cari nama / SKU… (bisa dari scanner barcode)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button className="btn btn-ghost btn-sm" type="button" onClick={scanning ? stopScan : () => void startScan()}>
              {scanning ? "Hentikan scan" : "Scan barcode"}
            </button>
          </div>
          <div style={{ display: scanning ? "block" : "none", marginBottom: 14 }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", maxHeight: 240, borderRadius: 10, background: "#000" }} />
            <p className="small muted">Arahkan kamera ke barcode produk. Kamera berhenti otomatis setelah terbaca.</p>
          </div>
          {scanError ? <p className="small" style={{ color: "var(--warn)", marginTop: -6 }}>{scanError}</p> : null}
          {loading ? (
            <p className="empty">Memuat…</p>
          ) : filtered.length === 0 ? (
            <p className="empty">Tidak ada produk. Tambahkan dari halaman Produk.</p>
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
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        {product.imageData ? (
                          <Image className="thumb" src={product.imageData} alt="" width={42} height={42} unoptimized />
                        ) : (
                          <span className="thumb thumb-empty" aria-hidden="true">{product.name.slice(0, 1)}</span>
                        )}
                        <div>
                          <div>{product.name}</div>
                          {product.sku ? <div className="small muted">{product.sku}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td className="num">{rupiah(product.price)}</td>
                    <td className="num muted">{product.stock}</td>
                    <td className="right">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => add(product)}>
                        +
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Keranjang</h2>
          {lines.length === 0 ? (
            <p className="empty">Belum ada item.</p>
          ) : (
            lines.map(({ product, qty }) => (
              <div className="cart-row" key={product.id}>
                <div className="product-cell">
                  {product.imageData ? (
                    <Image className="thumb" src={product.imageData} alt="" width={42} height={42} unoptimized />
                  ) : (
                    <span className="thumb thumb-empty" aria-hidden="true">{product.name.slice(0, 1)}</span>
                  )}
                  <div>
                    <div>{product.name}</div>
                    <div className="small muted">{rupiah(product.price)} × {qty}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => changeQty(product.id, -1)}>−</button>
                  <strong>{qty}</strong>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => changeQty(product.id, 1)}>+</button>
                  <span className="small" style={{ minWidth: 90, textAlign: "right" }}>
                    {rupiah(product.price * qty)}
                  </span>
                </div>
              </div>
            ))
          )}

          <div className="delivery-box" style={{ marginTop: 18 }}>
            <h3 className="section-title">Member & struk email</h3>
            <div className="delivery-grid">
              <label className="field">
                <span>Cari / email member</span>
                <input
                  className="input"
                  type="email"
                  list="customer-options"
                  value={customerEmail}
                  onChange={(event) => pickCustomerEmail(event.target.value)}
                  placeholder="nama@email.com"
                />
                <datalist id="customer-options">
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.email}>{customer.name}</option>
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Nama member</span>
                <input
                  className="input"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama pembeli"
                />
              </label>
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Pilih member yang sudah tersimpan atau ketik email baru. Email baru otomatis jadi member,
              dan struk dikirim dari server setelah pembayaran berhasil.
            </p>
            {selectedEmail ? (
              <p className="small" style={{ marginBottom: 0, color: selectedMember ? "var(--ok)" : "var(--warn)" }}>
                {selectedMember
                  ? `Member ditemukan: ${selectedMember.name} · ${selectedMember.salesCount ?? 0} transaksi`
                  : "Email baru akan disimpan sebagai member setelah bayar."}
              </p>
            ) : null}
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="field">
              <span>Diskon (Rp)</span>
              <input className="input" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label className="field">
              <span>Uang diterima (Rp)</span>
              <input
                className="input"
                type="number"
                min={0}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className="total-line">
            <span>Total</span>
            <span>{rupiah(total)}</span>
          </div>
          <div className="total-line" style={{ fontSize: 15, color: paidValue < total ? "var(--danger)" : "var(--ok)" }}>
            <span>Kembalian</span>
            <span>{rupiah(change)}</span>
          </div>

          <button className="btn btn-primary" type="button" onClick={checkout} disabled={saving || lines.length === 0} style={{ width: "100%" }}>
            {saving ? "Memproses…" : `Bayar ${rupiah(total)}`}
          </button>
        </section>
      </div>
    </>
  );
}
