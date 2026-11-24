# Panduan deploy

Dua jalur: **Vercel + MySQL cloud** (paling cepat) atau **VPS/Docker** (kontrol penuh).

## Opsi A — Vercel

1. Buat MySQL cloud (Railway / PlanetScale / Aiven). Catat connection string.
2. Import project ke Vercel, framework preset **Next.js**.
3. Isi Environment Variables:

| Variable | Contoh / catatan |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/kasirku` |
| `JWT_SECRET` | string acak 48 byte: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `https://kasirku.vercel.app` |
| `RESEND_API_KEY` | opsional, tapi **wajib di production** untuk verifikasi email & reset password |
| `EMAIL_FROM` | `Kasirku <halo@domainkamu.com>` (domain terverifikasi di Resend) |
| `WHATSAPP_ACCESS_TOKEN` | opsional; token permanen WhatsApp Business Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | opsional; Phone Number ID dari Meta Business Suite |
| `WHATSAPP_API_VERSION` | `v21.0` (default) |
| `MIDTRANS_SERVER_KEY` | opsional; kosongkan untuk transfer manual |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | opsional |
| `MIDTRANS_IS_PRODUCTION` | `false` saat sandbox, `true` saat production |
| `AGENCY_COMMISSION_RATE` | `0.15` |

4. Deploy. Jalankan migrasi sekali lewat Vercel Shell / lokal yang tersambung ke DB production:

```powershell
npx prisma migrate deploy
npm run db:seed   # opsional, HANYA untuk demo
```

5. Di dashboard Midtrans, pasang webhook:

```
https://kasirku.vercel.app/api/billing/midtrans/webhook
```

6. Cek: `/`, `/login`, `/register`, `/robots.txt`, `/sitemap.xml`.

> Catatan: `output: "standalone"` aman di Vercel; Vercel tetap memakai builder-nya sendiri.

## Opsi B — VPS + Docker Compose

Butuh Docker Engine + Docker Compose plugin. Copy `.env.example` ke `.env`, isi semua variabel, lalu:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Compose akan:
- membuat MariaDB dengan volume persisten,
- menunggu database sehat,
- menjalankan `prisma migrate deploy` otomatis saat container app start,
- menyajikan app di port `3000`.

Pasang reverse proxy (Caddy/Nginx) + TLS di depannya, lalu set `NEXT_PUBLIC_APP_URL` ke domain final.

### Backup

```bash
docker compose -f docker-compose.prod.yml exec db mariadb-dump -ukasirku -p kasirku > backup.sql
```

## Checklist sebelum dijual

- [ ] `JWT_SECRET` production berbeda dari lokal
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` aktif (verifikasi, reset, dan struk email benar-benar terkirim)
- [ ] `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` aktif bila struk WhatsApp harus terkirim tanpa konfirmasi kasir
- [ ] Webhook Midtrans terpasang dan signature terverifikasi (cek log audit `PAYMENT_APPROVED`)
- [ ] `NEXT_PUBLIC_APP_URL` tanpa trailing slash dan sesuai domain
- [ ] Seed demo **dihapus** atau diganti data kosong untuk tenant production
- [ ] Rate limit in-memory sudah direncanakan diganti Redis jika trafik naik
- [ ] Backup database otomatis aktif
- [ ] Terms & Privacy Policy dipasang (bisa halaman statis)

## Yang belum ada

- Email verifikasi saat ini opsional untuk login (banner di dashboard), bukan pemblokir. Ini disengaja supaya akun demo tidak rusak; bisa diubah dengan menambah pengecekan di `lib/auth.ts`.
- Rate limiter masih in-memory (per-instance).
