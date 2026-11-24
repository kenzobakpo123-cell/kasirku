# Skrip demo 10 menit

Tujuan: tunjukkan bahwa ini produk yang bisa dijual ke agensi/freelancer, bukan sekadar CRUD.

## Persiapan (1 menit)

```powershell
cd "D:\My project\kasirku"
npm run db:migrate
npm run db:seed
npm run dev
```

Buka http://localhost:3000.

## Alur

### 1. Landing (1 menit)
Tunjukkan problem → fitur → cara kerja → studi kasus → harga → CTA.
Poin: harga jelas, ada paket agensi, ada paket setup Rp500.000.

### 2. Login agensi (1 menit)
`agency@kasirku.test` / `agency12345`.
Tunjukkan `/agency`: 3 toko klien, omzet gabungan, estimasi komisi, tabel klien.
Poin: ini pembeli langsungnya — agensi, bukan UMKM satu per satu.

### 3. Buat kode referral (1 menit)
Klik “Buat kode”, salin link. Jelaskan: klien daftar pakai link → otomatis terhubung + agensi dapat akses.

### 4. Ganti tenant ke Kopi Senja (30 detik)
Pakai dropdown “Toko”. Tunjukkan bahwa satu akun bisa pindah konteks dengan aman.

### 5. Gambar produk, kasir, member, stok & struk email (2 menit)
Di `/produk`, tunjukkan gambar pada tiap baris. Tambah produk baru: pilih gambar JPG/PNG, biarkan kolom nama kosong —
nama produk otomatis diisi dari nama file — lalu isi harga dan stok.
Buka `/kasir`, lihat gambar produk, tambah Kopi Americano, diskon. Ketik `nadia@example.com` pada kolom **Cari / email member**
— nama Nadia Putri terisi otomatis — lalu bayar. Tunjukkan status struk email di kartu transaksi dan tombol **Kirim ulang struk**.
Ketik email baru `budi@example.com` pada transaksi berikutnya untuk membuktikan member otomatis tersimpan.
Buka `/member`, cari `budi` — member baru muncul lengkap dengan jumlah transaksi dan total belanja.
Lalu buka `/produk`, lihat stok berkurang, klik “+ Stok” → riwayat mutasi tercatat.

### 6. Laporan (1 menit)
Buka `/laporan`. Tunjukkan omzet harian, laba kotor, produk terlaris, stok menipis. Ekspor CSV Penjualan dan Produk.

### 7. Tim & outlet (1 menit)
Buka `/tim`. Tunjukkan daftar anggota dan outlet. Jelaskan RBAC: owner/manager/kasir/agensi.

### 8. Billing (1 menit)
Buka `/tagihan`, ajukan upgrade PRO, lalu login `admin@kasirku.test / admin12345`, buka `/admin`, setujui. Balik ke akun kopi → paket berubah.

### 9. Offline (1 menit)
Matikan network di DevTools, buat transaksi, lalu nyalakan lagi. Antrean otomatis sinkron memakai idempotency key yang sama.

### 10. Import CSV & keamanan akun (1 menit)
Buka `/produk` → “Import dari CSV”, unduh contoh, lalu import. Buka `/akun`: lihat perangkat aktif dan
ganti password (perangkat lain otomatis dicabut).

### 11. Barcode & email (1 menit)
Di `/produk`, klik **Label** pada Kopi Americano untuk membuka barcode CODE128-nya. Cetak atau tampilkan di HP kedua.
Kembali ke `/kasir`, klik **Scan barcode**, arahkan kamera ke label — produk langsung masuk keranjang. Browser tanpa
`BarcodeDetector` otomatis memakai fallback ZXing; input SKU manual tetap tersedia.
Daftarkan akun baru di `/register` — tanpa `RESEND_API_KEY`, response register memuat `devVerifyUrl` untuk langsung mencoba verifikasi. Coba juga `/lupa-password`.

### 12. Midtrans (opsional, 1 menit)
Isi kredensial sandbox `.env`, buka `/tagihan` → “Bayar otomatis (Midtrans)”. Tekankan webhook terverifikasi
dan aktivasi paket yang idempoten. Tanpa kredensial, alur transfer manual tetap tampil dan bisa dibuktikan sampai paket aktif.

## Penutup (30 detik)
“Satu produk, dua pembayaran: langganan outlet + komisi agensi. Gambar produk, kasir, member, stok, barcode, struk email otomatis, Midtrans, dan webhook terverifikasi sudah berjalan.”

## Reset data
`npm run db:seed` menghapus data demo dan mengisinya ulang.
