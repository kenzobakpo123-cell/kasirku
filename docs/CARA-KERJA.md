# Cara kerja Kasirku

Dokumen ini menjelaskan dua alur yang paling sering ditanya: **pembayaran langganan** dan **barcode kasir**.

## 1. Alur penjualan di kasir

1. Owner/manager menambah produk di `/produk`, lengkap dengan **SKU**.
2. Kasir membuka `/kasir`, mencari nama/SKU, atau memindai barcode.
3. Saat barcode terbaca, SKU dicocokkan dengan produk. Produk langsung masuk keranjang dan kolom pencarian terisi otomatis.
4. Kasir memasukkan uang bayar, lalu menekan **Bayar**.
5. Server membuat transaksi dalam satu database transaction: nomor invoice dibuat, stok dicek, stok dikurangi, dan mutasi stok dicatat. Kalau stok tidak cukup, transaksi ditolak — tidak pernah minus.
6. Struk muncul, bisa dicetak 58 mm atau dikirim lewat WhatsApp.
7. `/laporan` otomatis menampilkan omzet, laba kotor, produk terlaris, dan stok menipis.

Idempotency key mencegah transaksi dobel saat jaringan mati: antrean offline memakai kunci yang sama ketika disinkronkan ulang.

## 2. Cara barcode bekerja

### Mensiapkan label

- Buka `/produk`.
- Pastikan produk punya SKU. Data demo sudah memakai SKU seperti `KS-AMER-001`.
- Klik **Label** pada baris produk. SVG barcode CODE128 akan terbuka di tab baru; bisa langsung dicetak atau disimpan.

### Memindai

- Buka `/kasir`, klik **Scan barcode**, izinkan kamera.
- Arahkan kamera ke label tersebut.
- Setelah terbaca, scanner berhenti otomatis dan produk masuk keranjang.
- Kalau barcode belum terdaftar, muncul pesan kesalahan dan input manual tetap bisa dipakai.

### Dukungan browser

- Chrome/Edge: memakai `BarcodeDetector` bawaan browser.
- Firefox/Safari dan browser lain: otomatis memakai fallback ZXing yang dimuat saat scanner dibuka.
- Kamera hanya bisa diakses di `localhost` atau lewat HTTPS. Di HP, buka lewat HTTPS — bukan alamat IP HTTP biasa.
- Format yang dikenali: CODE128, CODE39, EAN-13, EAN-8, UPC-A, dan QR code.

## 3. Alur pembayaran langganan

Ada dua jalur:

### A. Transfer manual (selalu tersedia)

1. Owner/manager membuka `/tagihan`, memilih paket PRO atau Agency, lalu mengisi catatan/bukti transfer.
2. Klik **Kirim pengajuan transfer**. Pembayaran tersimpan dengan status `PENDING`.
3. Admin login (`admin@kasirku.test` / `admin12345`), membuka `/admin`, lalu menyetujui pembayaran.
4. Dalam satu transaksi, status pembayaran berubah jadi `PAID` dan `Subscription` tenant diperbarui ke paket yang dibeli.
5. Kembali ke `/tagihan` akun tenant — paket dan batasnya sudah berubah.
6. Menolak pembayaran juga tersedia; paket tetap tidak berubah.

Nominal PRO dihitung per outlet (`Rp199.000 × jumlah outlet`), Agency flat `Rp499.000`.

### B. Midtrans Snap (opsional)

1. Isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, dan `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` di `.env` (sandbox dulu).
2. Di `/tagihan`, klik **Bayar otomatis (Midtrans)**.
3. Server membuat order ke Snap Midtrans, menyimpan pembayaran `PENDING`, dan membuka jendela pembayaran.
4. Setelah pembayaran lunas, Midtrans mengirim webhook ke `/api/billing/midtrans/webhook`.
5. Webhook memverifikasi signature **dan** mengecek status ke API Midtrans, lalu mengaktifkan paket secara idempoten.
6. Webhook adalah sumber kebenaran. Polling di UI hanya menyegarkan tampilan, bukan mengaktifkan paket.

Tanpa kredensial Midtrans, tombol otomatis mengembalikan pesan yang jelas dan transfer manual tetap berfungsi. Midtrans tidak disimpan di repo.

## 4. Ringkasan untuk demo

```text
Daftar/login → buat produk + SKU → cetak Label → buka kasir → scan → bayar → stok turun → laporan jadi
                                                         ↓
                                     /tagihan → ajukan upgrade → admin setujui → paket aktif
```

Akun demo ada di [`DEMO.md`](DEMO.md). Untuk produksi, ikuti [`DEPLOY.md`](DEPLOY.md).
