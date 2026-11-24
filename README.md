# Kasirku

> Kasir & stok untuk UMKM — dikelola dari satu dashboard oleh agensi/freelancer.

Project ke-2. **Terpisah** dari `keuangan-pribadi` (project ke-1) dan tidak akan mengubahnya.

## Model bisnis

Pembeli langsung: **agensi / freelancer** yang melayani UMKM. Pengguna akhir: **toko klien** mereka.

| Paket | Harga | Isi |
|---|---|---|
| Gratis | Rp0 | 1 outlet, 100 transaksi/bulan, 3 produk |
| Pro | Rp199.000 / outlet / bulan | Stok & laporan tanpa batas, multi-kasir, struk |
| Agency | Rp499.000 / bulan | Banyak tenant klien, laporan gabungan, white-label, komisi 15% |
| Setup bantuan | Rp500.000 (sekali) | Import produk + pelatihan; gratis 5 klien pertama |

## MVP

1. Onboarding tenant + outlet + undang kasir
2. Produk & stok (CRUD, gambar produk, stok minimum, riwayat mutasi)
3. Kasir PWA (keranjang, diskon, pembayaran, struk cetak + kirim otomatis ke email)
4. Member pembeli (tersimpan otomatis lewat email, pencarian cepat, riwayat belanja)
5. Laporan (penjualan harian, produk terlaris, stok menipis, ekspor CSV)
6. RBAC `OWNER`/`MANAGER`/`CASHIER`/`AGENCY` + audit log + sesi perangkat
7. Dashboard agensi + kode referral
8. Billing manual (transfer + verifikasi) **atau otomatis** lewat Midtrans Snap (QRIS/VA/kartu)
9. Import produk CSV, akun & keamanan (sesi perangkat, ganti password)

**Roadmap:** purchase order supplier, video demo final, deploy production.

## Arsitektur (rencana)

- Next.js 16 App Router, React 19, TypeScript strict
- Prisma 6 + MySQL (database `kasirku`)
- Multi-tenant via `tenantId` pada semua tabel, di-inject lewat Prisma client extension `$extends`
- Isolasi tenant diapplication layer + test khusus (MySQL tidak punya RLS seperti Postgres)
- Stok aman dari race condition: `$transaction` + `updateMany` dengan syarat `stok >= qty`
- Auth: JWT `jose`, refresh token di-hash, cookie httpOnly (pola project ke-1), PWA tanpa Expo

## Akun demo (setelah `npm run db:seed`)

| Peran | Email | Password |
|---|---|---|
| Admin | `admin@kasirku.test` | `admin12345` |
| Agensi | `agency@kasirku.test` | `agency12345` |
| Owner Kopi Senja | `kopi@kasirku.test` | `demo12345` |
| Owner Baju Rapi | `baju@kasirku.test` | `demo12345` |

Kode referral agensi: `RANI15`. Akun agensi otomatis memiliki akses ke toko Kopi Senja & Baju Rapi.

## Menjalankan lokal

1. Pastikan **MySQL/XAMPP aktif di port 3306**. Kasirku memakai database `kasirku` dan user `kasirku` sendiri — database `keuangan` milik project ke-1 tidak disentuh.
2. `copy .env.example .env` — ganti `JWT_SECRET` dengan string acak 32+ karakter:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. `npm install`
4. `npm run db:migrate`
5. `npm run db:seed` (opsional; isi 4 akun demo + transaksi)
6. `npm run dev` → http://localhost:3000
7. Daftar: nama, nama toko, email, password. Toko "Kasir Utama" otomatis dibuat.

Alternatif tanpa XAMPP: nyalakan Docker Desktop, `docker compose up -d` (MySQL di port 3308), lalu ubah `DATABASE_URL` di `.env` ke port 3308.

Cek: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

### Midtrans (opsional)

Isi `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, dan `MIDTRANS_IS_PRODUCTION` di `.env`.
Tanpa itu, halaman tagihan otomatis memakai alur transfer manual. Pasang webhook di dashboard Midtrans ke
`POST {NEXT_PUBLIC_APP_URL}/api/billing/midtrans/webhook`. Webhook memverifikasi signature SHA-512 dan
mengonfirmasi status ke API Midtrans sebelum mengaktifkan paket, jadi tidak bisa ditipu lewat request palsu.

## Status

- [x] Folder & git repository dibuat
- [x] Scaffold Next.js 16 (docs lokal dibaca dulu, sesuai `AGENTS.md`)
- [x] Model data & migrasi awal Prisma
- [x] Auth (register/login/refresh/logout), session rotation, CSRF guard
- [x] Multi-tenant + membership + RBAC (owner/manager/cashier/agency)
- [x] Produk & stok, transaksi kasir anti-stok-minus + idempotensi
- [x] Dashboard, halaman produk, kasir, landing page + pricing
- [x] Dashboard agensi lintas-tenant + referral & komisi otomatis
- [x] Billing manual (pengajuan → verifikasi admin → upgrade paket) + batas paket
- [x] Seed 4 tenant demo (admin, agensi, kopi, butik) + transaksi & stok menipis
- [x] Laporan harian, laba kotor, produk terlaris, ekspor CSV (penjualan & produk)
- [x] Struk cetak 58 mm + kirim email; pencarian nama/SKU untuk scanner
- [x] Manajemen tim (RBAC) & outlet, edit produk + restock dengan riwayat mutasi
- [x] Antrean transaksi offline dengan idempotency key + auto-sinkron
- [x] Landing page conversion: cara kerja, studi kasus, FAQ, CTA
- [x] Identitas visual custom: font self-hosted, layout editorial, ikon SVG, sidebar workspace (tanpa template generik)
- [x] Import produk CSV (header ID/EN, validasi baris, batas paket, riwayat stok)
- [x] Akun & keamanan: sesi perangkat + cabut akses, ganti password mencabut sesi lain
- [x] Midtrans Snap (checkout + webhook terverifikasi + aktivasi paket idempoten)
- [x] Email verifikasi + lupa/reset password (token di-hash, sekali pakai, Resend)
- [x] Barcode scanner kamera (BarcodeDetector + fallback ZXing) + label CODE128 per produk
- [x] Gambar produk (upload ringkas, pratinjau, tampil di kasir & keranjang)
- [x] Member pembeli otomatis dari email + pencarian nama/email + ringkasan belanja
- [x] Struk email otomatis ke member (Resend + kirim ulang)
- [x] CI GitHub Actions (typecheck, lint, test, build)
- [x] Dockerfile + docker-compose produksi + panduan Vercel
- [x] Naskah video demo 3 menit
- [x] 58 unit test, lint, typecheck, build hijau + robots/sitemap
- [ ] Video demo final & deploy production

Cara kerja: [`docs/CARA-KERJA.md`](docs/CARA-KERJA.md). Panduan demo: [`docs/DEMO.md`](docs/DEMO.md).
Catatan teknis: [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md). Deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md).
Naskah video: [`docs/VIDEO.md`](docs/VIDEO.md).

## Catatan

- Jangan commit `.env` dengan secret asli. Gunakan `.env.example` sebagai templat.
- `npm audit` melaporkan 4 advisory **high** pada CLI Prisma (`@prisma/config` → `deepmerge-ts`/`effect`). Ini dev-tooling, bukan `@prisma/client` runtime. Perbaikan tersedia dengan naik ke Prisma 8; sengaja belum dilakukan supaya konsisten dengan project ke-1 (Prisma 6).
- Docker Desktop terpasang tetapi daemon sempat mati (`npipe:////./pipe/dockerDesktopLinuxEngine`), jadi scaffold ini memakai MySQL XAMPP yang sudah berjalan di port 3306. Tabel privilege `mysql.db` di XAMPP sempat corrupt dan sudah di-repair; user `kasirku` dibuat khusus dengan grant hanya untuk database `kasirku`.
- File migrasi sempat mengandung BOM UTF-8 dari PowerShell; sudah dibersihkan dan migrasi terverifikasi `prisma migrate deploy`.
