---
description: Security guardrails for Selera Sambal QR Ordering App (server-authoritative pricing, admin auth, QR token, Supabase RLS, LLM chatbot security, and injection/upload defenses)
globs: "**/app/api/**/*.ts, **/prisma/**/*.prisma, **/lib/**/*.ts"
alwaysApply: true
---

# Selera Sambal — Security Guardrails

1. **Server-Authoritative Pricing & Status:**
   - Never trust `price`, `subtotal`, `discount`, `taxAmount`, `serviceChargeAmount`, `total`, `paymentStatus`, or `status` from client request bodies.
   - Always validate request payloads with Zod `.strict()` and recalculate all monetary values from active database records inside a transaction.
2. **Admin Endpoint Protection:**
   - Every admin Route Handler (`POST/PUT/PATCH/DELETE` on menu, categories, promos, settings, upload, orders, tables, coupons, and `GET` on admin/all-orders views) MUST call `requireAdmin(req)` at the top of the handler.
3. **Atomic Coupon Usage (WIB):**
   - Coupon daily limits (1x per day per device/customer) must be enforced at the database level via `CouponUsage` (`@@unique([couponId, deviceId, usageDate])`) using `todayWIB()` (`Asia/Jakarta`), never via application-level read-then-update alone.
4. **Supabase RLS on New Tables:**
   - Every new table added to `prisma/schema.prisma` in the `public` schema must have `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` applied in its migration so the public Supabase Data API (`anon` key) cannot read or write to it directly.
5. **Generic Client Errors & Secret Hygiene:**
   - Never return raw `err.message` or Prisma stack traces in 500 responses.
   - Never place server secrets in `NEXT_PUBLIC_*` environment variables or hardcode fallback credentials in client components.
6. **Keamanan Chatbot AI (Groq):**
   - Panggilan ke API LLM hanya boleh dilakukan dari server menggunakan `GROQ_API_KEY` (tanpa prefix `NEXT_PUBLIC_`).
   - Tolak pesan dengan `role: "system"` dari client, batasi panjang pesan (`<= 300` karakter) dan riwayat (`<= 6` giliran), bungkus data konteks di dalam `<data_referensi>...</data_referensi>`, serta terapkan rate limit per IP dan kuota harian global (`CHATBOT_DAILY_LIMIT`).
7. **Pencegahan Injection, Mass Assignment, dan Upload Berbahaya:**
   - Semua endpoint tulis wajib memvalidasi body dengan Zod `.strict()` dan dilarang meneruskan `body` mentah langsung ke Prisma (`data: body`).
   - Semua input URL wajib divalidasi dengan `safeUrl()` (`http:` / `https:` saja; tolak `javascript:` dan `data:`).
   - Upload gambar dibatasi maksimal 5 MB hanya untuk `image/jpeg`, `image/png`, dan `image/webp` (tolak SVG/GIF) dengan verifikasi *magic bytes* di server.
