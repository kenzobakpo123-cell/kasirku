# Cara kerja Kasirku

Dokumen ini menjelaskan alur utama: **gambar produk**, **barcode kasir**, **member**, **pembayaran langganan**, dan **struk email otomatis**.

## 1. Alur penjualan di kasir

1. Owner/manager menambah produk di `/produk`. Pilih gambar JPG/PNG/WebP — gambar otomatis dikecilkan, dan nama file bisa langsung jadi nama produk bila kolom nama kosong.
2. Gambar tampil di daftar produk, di daftar produk kasir, dan di keranjang. Data demo sudah memakai gambar untuk tiap produk.
3. Kasir membuka `/kasir`, mencari nama/SKU, atau memindai barcode.
4. Saat barcode terbaca, SKU dicocokkan dengan produk. Produk langsung masuk keranjang dan kolom pencarian terisi otomatis.
5. Kasir memilih member dari daftar atau mengetik email baru, mengisi nama, memasukkan uang bayar, lalu menekan **Bayar**.
6. Email baru otomatis tersimpan sebagai member. Email yang sudah ada memakai data member tersebut, jadi tidak perlu daftar manual tiap transaksi.
7. Server membuat transaksi dalam satu database transaction: nomor invoice dibuat, member dihubungkan, stok dicek, stok dikurangi, dan mutasi stok dicatat. Kalau stok tidak cukup, transaksi ditolak — tidak pernah minus.
8. Setelah transaksi tersimpan, server mengirim struk ke email member. Struk juga muncul di layar untuk dicetak 58 mm.
9. `/laporan` otomatis menampilkan omzet, laba kotor, produk terlaris, dan stok menipis.

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

## 4. Member dan struk email otomatis

Di `/kasir`, bagian **Member & struk email** berisi dua kolom: **Cari / email member** dan **Nama member**.

- Ketik email yang sudah terdaftar, atau pilih dari saran yang muncul. Nama member terisi otomatis.
- Ketik email baru — setelah transaksi berhasil, email itu langsung menjadi member baru di toko tersebut.
- Email dinormalkan ke huruf kecil, jadi `Nadia@Example.com` dan `nadia@example.com` dianggap member yang sama.
- Tidak ada kolom nomor WhatsApp dan tidak ada pilihan kanal: struk selalu dikirim ke email.

Halaman `/member` menampilkan semua member dengan pencarian nama/email, jumlah transaksi, total belanja, dan kunjungan terakhir. Member juga bisa ditambah atau diubah manual di sana. Menghapus member tidak menghapus riwayat transaksinya.

Pengiriman terjadi dari server setelah transaksi berhasil lewat Resend, sehingga kasir tidak perlu menyalin atau membagikan manual. Kegagalan pengiriman tidak membatalkan penjualan; status dan alasannya tampil di kartu struk dan tombol **Kirim ulang struk** tersedia. Tanpa `RESEND_API_KEY`, development mencatat isi email di log server supaya alur tetap bisa diuji; di production variabel ini wajib diisi.

## 5. Ringkasan untuk demo

```text
Daftar/login → tambah produk + gambar + SKU → cetak Label → buka kasir → scan → pilih member → bayar
                                                                              ↓
                                                       member tersimpan + struk email → stok turun → laporan jadi
                                                                              ↓
                                     /tagihan → ajukan upgrade → admin setujui → paket aktif
```

Akun demo ada di [`DEMO.md`](DEMO.md). Untuk produksi, ikuti [`DEPLOY.md`](DEPLOY.md).
