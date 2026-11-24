# Cara kerja Kasirku

Dokumen ini menjelaskan alur utama: **gambar produk**, **barcode kasir**, **pembayaran langganan**, dan **struk otomatis ke pembeli**.

## 1. Alur penjualan di kasir

1. Owner/manager menambah produk di `/produk`. Pilih gambar JPG/PNG/WebP — gambar otomatis dikecilkan, dan nama file bisa langsung jadi nama produk bila kolom nama kosong.
2. Gambar tampil di daftar produk, di daftar produk kasir, dan di keranjang. Data demo sudah memakai gambar untuk tiap produk.
3. Kasir membuka `/kasir`, mencari nama/SKU, atau memindai barcode.
4. Saat barcode terbaca, SKU dicocokkan dengan produk. Produk langsung masuk keranjang dan kolom pencarian terisi otomatis.
5. Kasir mengisi nama/kontak pembeli, memilih kanal struk, memasukkan uang bayar, lalu menekan **Bayar**.
6. Server membuat transaksi dalam satu database transaction: nomor invoice dibuat, stok dicek, stok dikurangi, dan mutasi stok dicatat. Kalau stok tidak cukup, transaksi ditolak — tidak pernah minus.
7. Setelah transaksi tersimpan, server mengirim struk ke WhatsApp/email pembeli. Struk juga muncul di layar untuk dicetak 58 mm.
8. `/laporan` otomatis menampilkan omzet, laba kotor, produk terlaris, dan stok menipis.

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

## 4. Struk otomatis ke pembeli

Di `/kasir`, bagian **Pembeli & pengiriman struk** berisi nama pembeli, nomor WhatsApp, email, dan pilihan kanal:

- **WhatsApp** — kirim lewat WhatsApp Business Cloud API bila `WHATSAPP_ACCESS_TOKEN` dan `WHATSAPP_PHONE_NUMBER_ID` diisi.
- **Email** — kirim lewat Resend bila `RESEND_API_KEY` diisi.
- **WhatsApp + email** — dua-duanya.
- **Tidak dikirim** — struk hanya tampil di layar.

Pengiriman terjadi dari server setelah transaksi berhasil, sehingga tidak perlu menekan tombol bagikan. Kegagalan pengiriman tidak membatalkan penjualan; status dan alasannya tampil di kartu struk dan tombol **Kirim ulang struk** tersedia.

Tanpa kredensial WhatsApp, development otomatis membuka `wa.me/<nomor pembeli>` dengan isi struk sudah terisi — masih langsung ke pembeli, tetapi tombol kirim terakhir tetap di WhatsApp. Tanpa `RESEND_API_KEY`, isi email dicatat di log server supaya alur tetap bisa diuji.

Nomor dinormalisasi ke format `62…`, jadi `0812-3456-7890`, `+62 812 3456 7890`, dan `6281234567890` semuanya dikenali.

## 5. Ringkasan untuk demo

```text
Daftar/login → tambah produk + gambar + SKU → cetak Label → buka kasir → scan → isi pembeli → bayar
                                                                              ↓
                                                       struk otomatis WA/email → stok turun → laporan jadi
                                                                              ↓
                                     /tagihan → ajukan upgrade → admin setujui → paket aktif
```

Akun demo ada di [`DEMO.md`](DEMO.md). Untuk produksi, ikuti [`DEPLOY.md`](DEPLOY.md).
