# QR Unik per Meja — Analysis Report (Phase 1)

## Temuan
- **Schema** (`prisma/schema.prisma`): model `RestaurantTable` (`@@map("tables")`) sudah ada: `id`, `tableNumber @unique`, `qrToken` (JWT 12 jam, tidak unik), `isActive`. `Order.tableNumber Int` wajib (diketik pelanggan), tanpa relasi. Tidak ada model reservasi (tombol "Reservasi Meja" di menu sebenarnya hanya pemilih nomor meja manual).
- **Tidak ada folder `prisma/migrations`**; skema dikelola lewat `prisma db push`. `src/prisma/*` (Prisma Next) tidak diimpor aplikasi.
- **Alur order**: `app/checkout/page.tsx` (input angka manual, disimpan di localStorage via `lib/store.ts`) -> `POST /api/orders` (`parseInt(body.tableNumber)`, dipercaya begitu saja) -> `Order.tableNumber`.
- **Tampilan nomor meja**: `app/order/[orderId]/page.tsx` (status + struk), `app/admin/page.tsx` (dashboard/pesanan), `components/admin/AnalyticsDashboard.tsx`, `components/FloatingCart.tsx` (badge + riwayat), `app/menu/page.tsx` (modal pilih meja), `app/table/[tableId]/page.tsx` (menyimpan nomor dari URL), chat system prompt (`app/api/chat/route.ts`, teks "isi nomor meja").
- **Routing/auth**: tidak ada `middleware.ts`/`proxy.ts`. Admin = satu halaman client `app/admin/page.tsx` (sidebar `NAV` + `renderPage`), login lokal client-side (admin/admin123). **Semua API admin tanpa proteksi server.**
- **Seed**: tidak ada script; `lib/db.ts` `connectDB()` auto-seed (tabel 1–10 hanya saat menu kosong, token JWT).
- **Env**: `DATABASE_URL`(pooler)/`DIRECT_URL`, Supabase, `JWT_SECRET`. Tidak ada base URL publik.
- **Deps**: `nanoid` sudah ada di node_modules (transitif), `qrcode` belum. `next lint` dihapus di Next 16 dan eslint tidak terpasang.
- **Next 16.3.5**: `cookies()`/`params` async; cookie hanya bisa di-set di Route Handler.

## Sudah ada (dipakai ulang)
`RestaurantTable`, `lib/prisma.ts`, `connectDB()` seed, pola `app/api/admin/*`, `DataTable`/`SmallBtn`/class admin di `app/admin/page.tsx`, halaman order/struk.

## Perlu diubah
| File | Perubahan |
|---|---|
| `prisma/schema.prisma` | `qrToken @unique`, `createdAt`, `Order.tableId String?` + relasi (nullable; `tableNumber` lama dipertahankan) |
| `lib/db.ts` | token pakai nanoid(10); backfill token JWT lama; seed meja 1–10 jika kosong |
| `app/api/orders/route.ts` | meja di-resolve server dari cookie; body `tableNumber` diabaikan |
| `app/api/tables/route.ts`, `[id]/route.ts` | GET publik tanpa token; POST/DELETE lama dihapus (dipindah ke admin ber-guard) |
| `app/checkout/page.tsx` | input meja diganti kartu "Meja N" / prompt scan QR |
| `app/menu/page.tsx` | hapus modal+tombol pilih meja; tampilkan chip "Meja N" |
| `components/FloatingCart.tsx` | badge meja dari `/api/table-context` |
| `app/table/[tableId]/page.tsx` | redirect ke `/menu`, tidak menyimpan nomor |
| `app/admin/page.tsx` | menu "Meja" di NAV + render `TablesManager` |
| `app/api/chat/route.ts` | 1 baris teks panduan |
| `.env.example` | `NEXT_PUBLIC_APP_URL`, `ADMIN_API_KEY` |

## Perlu dibuat
`lib/tableToken.ts` (konstanta cookie, token, resolver cookie, URL builder), `lib/adminGuard.ts`, `app/t/[token]/route.ts`, `app/qr-tidak-valid/page.tsx`, `app/api/table-context/route.ts`, `app/api/admin/tables/route.ts` + `[id]/route.ts`, `lib/useTableContext.ts`, `components/admin/TablesManager.tsx`, `app/admin/tables/print/page.tsx`.

## Risiko / asumsi
1. Admin API guard: `ADMIN_API_KEY` (header `x-admin-key`), dimasukkan admin sekali di halaman Meja (sessionStorage). Jika env kosong: diizinkan di dev, ditolak di production. (Keputusan user.)
2. `/table/[tableId]` dan QR universal lama tidak lagi menentukan meja; tanpa scan, checkout diblokir. (Keputusan user.)
3. Memakai `RestaurantTable` (bukan model `Table` baru) agar diff minimal; `tableNumber`/`qrToken` setara `number`/`token`.
4. Perubahan DB aditif via `prisma db push` (tanpa `--force-reset`); token JWT lama diganti saat backfill (belum pernah dicetak).
5. Order lama (`tableId` null) tetap tampil dari `tableNumber`.
6. Cookie menyimpan token; setiap order dicek ulang ke DB, sehingga nonaktif/regenerate langsung berlaku.

## Urutan implementasi
schema + deps -> lib helper -> `/t/[token]` + error page + table-context -> orders API -> customer UI -> admin API/UI/print -> seed/env -> verifikasi.
