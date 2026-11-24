# Naskah video demo 3 menit

Format: 1080p, layar browser 1440×900, tanpa wajah. Narasi bahasa Indonesia, tempo tenang.
Tujuan: calon pembeli (agensi/freelancer) paham dalam 3 menit bahwa ini produk yang bisa dijual.

## 0:00–0:15 — Hook

**Layar:** landing page, hero + harga.

**Narasi:**
"UMKM sering kehilangan uang bukan karena tidak laku, tapi karena stok tidak tercatat dan transaksi berantakan. Ini Kasirku — kasir dan stok dalam satu aplikasi, dikelola dari satu dashboard oleh agensi."

## 0:15–0:40 — Masalah & solusi

**Layar:** scroll ke fitur, cara kerja, studi kasus.

**Narasi:**
"Tanpa install, tanpa server sendiri. Buat toko, masukkan produk, buka kasir. Stok otomatis berkurang, laporan langsung jadi. Untuk agensi, satu akun bisa memantau banyak klien sekaligus."

## 0:40–1:15 — Dashboard agensi

**Layar:** login `agency@kasirku.test`, buka `/agency`. Sorot omzet gabungan, estimasi komisi, tabel klien, kode referral `RANI15`.

**Narasi:**
"Di sini agensi melihat semua klien dalam satu layar. Kode referral otomatis menghubungkan klien baru dan menghitung komisi 15 persen. Ini alasan pembelinya adalah agensi, bukan satu per satu UMKM."

## 1:15–1:55 — Kasir + stok

**Layar:** ganti tenant ke Kopi Senja, buka `/produk`, tunjukkan gambar produk dan klik **Label** pada Kopi Americano, lalu buka `/kasir`, klik **Scan barcode**, arahkan kamera ke label — produk masuk keranjang. Ketik `nadia@example.com`, tunjukkan nama member terisi otomatis, diskon, bayar. Tunjukkan status "Struk otomatis terkirim ke email pembeli" dan struknya, lalu klik cetak. Buka `/member`, cari email itu. Buka `/produk`, lihat stok turun, klik **+ Stok**.

**Narasi:**
"Tiap produk punya gambar; tinggal pilih file dan nama produk bisa diambil dari nama file. Label barcode CODE128 bisa dicetak langsung. Scanner memakai kamera, dengan fallback lintas browser; kalau kamera tidak tersedia, SKU tetap bisa diketik. Pembeli cukup diidentifikasi lewat email: member lama langsung dikenali, email baru otomatis jadi member. Setelah bayar, server langsung mengirim struk ke email — kasir tidak perlu menyalin atau membagikan manual. Transaksi diproses dengan transaksi database bersyarat: stok hanya berkurang kalau masih cukup. Tidak bisa minus, tidak ada dobel transaksi."

## 1:55–2:20 — Laporan & CSV

**Layar:** `/laporan`, filter tanggal, sorot laba kotor dan produk terlaris, klik ekspor CSV.

**Narasi:**
"Owner tidak perlu lagi rekap manual. Omzet harian, laba kotor, produk terlaris, dan stok menipis tersedia. CSV bisa langsung dibuka di Excel."

## 2:20–2:45 — Tim, offline, keamanan

**Layar:** `/tim` tambah kasir, matikan network di DevTools, buat transaksi, nyalakan lagi → antrean sinkron. Buka `/akun` → perangkat aktif.

**Narasi:**
"Akses dibagi per peran: owner, manager, kasir, agensi. Saat sinyal mati, transaksi masuk antrean dengan kunci idempotensi yang sama, lalu sinkron otomatis tanpa menggandakan stok. Sesi perangkat juga bisa dicabut."

## 2:45–3:00 — Billing & closing

**Layar:** `/tagihan`, ajukan upgrade, login admin, setujui di `/admin`, balik ke tenant → paket PRO.

**Narasi:**
"Pembayaran manual sudah jalan; Midtrans Snap juga tersedia dengan webhook terverifikasi. Mulai gratis, naik paket saat transaksi berjalan. Kasirku — satu produk, dua sumber pendapatan: langganan outlet dan komisi agensi."

## Tips produksi

- RekamDemo: `docs/DEMO.md` berisi urutan klik lengkap + akun demo.
- Tambah kapten subtitle di video (YouTube otomatis saja cukup).
- Sertakan link localhost? Jangan. Tunjukkan demo production/Staging URL.
- Simpan thumbnail: hero + tulisan "Kasir & Stok untuk UMKM — dikelola agensi".
- Jangan tampilkan `.env`, token Midtrans, atau password asli di layar.
