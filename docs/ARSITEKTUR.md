# Catatan arsitektur

## Isolasi tenant

Setiap tabel data (`Product`, `Sale`, `StockMovement`, `Payment`, `AuditLog`, dll.) memiliki `tenantId`.
Tidak ada query data yang boleh tanpa filter tenant. Semua route handler data melewati
`tenantContext(req)` (`lib/api-auth.ts`), yang memeriksa:

1. access token valid → `viewer`
2. cookie / header tenant aktif valid
3. membership viewer pada tenant tersebut masih ada

Untuk Server Component, `requirePageContext()` memakai jalur yang sama lewat cookie.
MySQL tidak punya RLS seperti Postgres, jadi isolasi dijamin di application layer + test.

## Stok anti-oversell

Penjualan berjalan dalam satu transaksi Prisma:

- harga dan modal diambil dari database, bukan dari browser
- `updateMany` bersyarat `stock >= qty` + `decrement`
- jika `count !== 1`, transaksi dibatalkan dan stok tidak berubah
- `StockMovement` ditulis dengan `refId` unik per item penjualan
- `Sale` punya `idempotencyKey` unik per tenant → retry tidak membuat transaksi ganda

## Autentikasi

- access token JWT `jose` (short-lived) di cookie httpOnly
- refresh token acak 32 byte, hanya hash SHA-256 yang disimpan
- rotasi refresh token + deteksi replay → cabut semua sesi
- `tokenVersion` user memungkinkan invalidasi global
- dummy bcrypt hash dipakai agar login tetap constant-time untuk email yang tidak ada
- CSRF guard `isSameOrigin` pada semua mutation

## Multi-tenant + agensi

`Membership` memetakan user ke tenant dengan role `OWNER/MANAGER/CASHIER/AGENCY/ADMIN`.
Kode referral (`ReferralCode`) menyimpan komisi dalam basis poin. Saat klien mendaftar:

- tenant klien dibuat
- `Referral` tercatat
- user agensi otomatis mendapat membership `AGENCY` pada tenant klien

Dashboard agensi menjumlahkan penjualan lintas tenant dan menghitung komisi dari `commissionBps`.

## Billing

Pembayaran masih manual (transfer + bukti + verifikasi admin) supaya MVP bisa dijual tanpa gateway.
Approve oleh admin meng-upgrade `Subscription` dalam transaksi yang sama dengan perubahan status `Payment`.
Midtrans direncanakan sebagai pengganti alur manual tanpa mengubah model `Payment`.

## Offline-first

Antrean transaksi disimpan di `localStorage` memakai `idempotencyKey` yang sama dengan permintaan awal.
Saat `online`, klien melakukan refresh sesi lalu mengirim ulang antrean. Karena `Sale.idempotencyKey`
unik per tenant, sinkron ulang tidak pernah menggandakan penjualan maupun pengurangan stok.

## Tradeoff yang disengaja

- Belum ada email verifikasi / reset password (direncanakan)
- Rate limit masih in-memory, bukan Redis
- Barcode memakai input SKU (kompatibel dengan scanner hardware); BarcodeDetector kamera menyusul
- Prisma 6 dipertahankan agar konsisten dengan project ke-1
