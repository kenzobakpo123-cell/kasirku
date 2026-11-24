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

Pembayaran manual (transfer + bukti + verifikasi admin) tetap tersedia supaya bisa dijual tanpa gateway.
Approve oleh admin meng-upgrade `Subscription` dalam transaksi yang sama dengan perubahan status `Payment`.
Midtrans Snap memakai model `Payment` yang sama dan webhook terverifikasi sebagai jalur otomatis.

## Offline-first

Antrean transaksi disimpan di `localStorage` memakai `idempotencyKey` yang sama dengan permintaan awal.
Saat `online`, klien melakukan refresh sesi lalu mengirim ulang antrean. Karena `Sale.idempotencyKey`
unik per tenant, sinkron ulang tidak pernah menggandakan penjualan maupun pengurangan stok.

## Pembayaran Midtrans

Checkout membuat `Payment` dengan `method = MIDTRANS_SNAP:<order_id>` sebelum Snap token dikembalikan ke browser.
Webhook `POST /api/billing/midtrans/webhook` memverifikasi signature SHA-512 dari `order_id`, `status_code`,
dan `gross_amount`, lalu mengonfirmasi ulang status ke API Midtrans. Hanya `settlement` / `capture+accept`
yang mengaktifkan subscription, dan hanya jika nominal cocok. Update dibatasi dengan `status = PENDING`,
sehingga webhook yang dikirim ulang tidak menggandakan aktivasi. Polling di UI hanya menyegarkan tampilan;
webhook tetap sumber kebenaran.

## Import CSV

Parser CSV mandiri menangani BOM, CRLF, koma dalam quote, dan quote ganda. Header menerima alias Bahasa Indonesia
(Nama, SKU, Harga, Modal, Stok, Stok Minimum) maupun Inggris. Angka seperti `22.000` dinormalisasi.
Maksimal 500 baris; SKU duplikat dalam file maupun dengan data toko ditolak. Setiap baris tervalidasi
memakai `productSchema` yang sama dengan form; stok awal > 0 ditulis sebagai `StockMovement` tipe `RESTOCK`.

## Verifikasi email & reset password

Token verifikasi/reset dibuat 32 byte acak; hanya hash SHA-256 yang disimpan di `EmailToken`, dengan TTL
24 jam untuk verifikasi dan 60 menit untuk reset. `consumeEmailToken` memakai `updateMany` bersyarat
`usedAt = null AND expiresAt > now` sehingga token hanya bisa dipakai sekali, juga saat ada request barengan.
Reset password menaikkan `tokenVersion` dan mencabut semua sesi aktif dalam satu transaksi. Endpoint
`forgot-password` selalu mengembalikan 200 agar tidak membocorkan email yang terdaftar. Saat `RESEND_API_KEY`
kosong dan masih development, link dikembalikan di response (`devUrl`) dan dicatat di log untuk keperluan testing;
di production email wajib dikonfigurasi.

## Barcode & pembayaran

Scanner kasir memakai `BarcodeDetector` bawaan Chrome/Edge bila tersedia; bila tidak, modul `@zxing/browser`
dimuat secara dinamis hanya saat tombol scanner ditekan. Kamera dihentikan lewat satu `scanStopRef` yang sama
untuk kedua jalur, termasuk saat komponen unmount. Label CODE128 dihasilkan di server oleh `bwip-js` pada route
`/api/products/[id]/barcode` dan dibatasi ke tenant aktif, sehingga SKU toko lain tidak bisa diintip.

Pembayaran manual dan Midtrans keduanya menulis row `Payment`. Aktivasi paket hanya terjadi di admin review
(transfer) atau webhook Midtrans yang terverifikasi; keduanya memakai transaksi database dan mengubah `Payment`
hanya dari `PENDING`. Webhook juga mengecek ulang status ke API Midtrans dan membandingkan nominal sebelum
mengaktifkan langganan, sehingga notifikasi palsu tidak bisa mengubah paket.

## Gambar, member, dan struk pembeli

Gambar dikompres di browser menjadi JPEG maksimal 720 px dan disimpan sebagai data URL di kolom `Product.imageData`
(`MEDIUMTEXT`). Ini membuat deploy portabel — tidak ada folder upload yang hilang di serverless — dengan batas
2 MB per gambar. Browser melakukan pratinjau sebelum produk disimpan, dan nama file bisa dipakai sebagai nama produk.

`Customer` adalah member per tenant dengan pasangan unik `(tenantId, email)`. Di dalam transaksi penjualan, server
mengakukan `upsert` berdasarkan email pembeli: email lama memakai member yang ada, email baru langsung mendaftar.
`Sale` menyimpan `customerId` sekaligus snapshot `customerName`/`customerEmail`, sehingga riwayat tetap benar bila
data member diubah atau member dihapus. Endpoint `/api/customers` mendukung pencarian nama/email dan ringkasan
jumlah transaksi serta total belanja lewat `groupBy`.

Struk dibuat dari data transaksi yang sudah tersimpan, lalu dikirim dari server setelah commit database lewat Resend.
Dev tanpa `RESEND_API_KEY` mencatat isi email di log; production mewajibkannya. Kegagalan pengiriman tidak menggulung
transaksi: hasilnya disimpan di `receiptSent`/`receiptError` dan bisa diulang lewat `/api/sales/[id]/resend`.

## Tradeoff yang disengaja

- Identitas member adalah email, bukan nomor telepon; lebih mudah dicari dan tidak perlu kanal WhatsApp
- Gambar produk disimpan di database, bukan object storage; cocok untuk katalog UMKM, bukan ribuan foto resolusi tinggi
- Rate limit masih in-memory, bukan Redis
- Barcode kamera butuh `localhost` atau HTTPS; input SKU manual tetap tersedia untuk scanner hardware
- Prisma 6 dipertahankan agar konsisten dengan project ke-1
