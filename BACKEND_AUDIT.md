# Selera Sambal / Warkop Betawa — Backend Gap Analysis, Benchmark & Revision Pass

Dokumen ini berisi hasil audit menyeluruh (*gap analysis*), perbandingan (*benchmark*) terhadap sistem self-order restoran dunia nyata (studi kasus: Mie Gacoan), serta catatan implementasi revisi backend dan frontend.

---

## Bagian 1 — Inventaris Backend Saat Ini (Audit Findings)

### 1.1. Fitur yang Berjalan Penuh End-to-End (UI → API Route → Database → UI)
| Fitur | Alur & Endpoint | Keterangan |
|---|---|---|
| **Daftar Menu & Kategori** | `GET /api/menu` → `app/menu/page.tsx` | Mengambil data item aktif dan kategori terurut dari Supabase via Prisma. |
| **Detail Menu & Opsi** | `app/menu/[itemId]/page.tsx` | Menampilkan detail menu, level pedas, pilihan add-on, dan penambahan ke keranjang (`localStorage`). |
| **Keranjang Belanja (Cart)** | `lib/store.ts` + `components/FloatingCart.tsx` + `app/cart/page.tsx` | Manajemen kuantitas, catatan per item, dan penghapusan item dengan sinkronisasi reaktif via event emitter. |
| **Pembuatan Pesanan (Checkout)** | `POST /api/orders` → Supabase | Pesanan masuk ke database dengan kode unik `ARU-XXXX`, tersimpan dengan status `received`. |
| **Pelacakan Status Pesanan** | `GET /api/orders/[id]` → `app/order/[orderId]/page.tsx` | Polling otomatis setiap 5 detik untuk memantau perubahan status pesanan (`received` → `preparing` → `ready` → `completed`). |
| **Admin: CRUD Menu & Kategori** | `GET/POST /api/menu`, `PUT/DELETE /api/menu/[id]`, `/api/categories` | Admin dapat mengelola menu, kategori, harga, dan ketersediaan. |
| **Admin: CRUD Promo** | `GET/POST /api/promos`, `PUT/DELETE /api/promos/[id]` | Pengelolaan diskon dan banner promosi. |
| **Admin: Manajemen Pesanan** | `GET /api/orders`, `PATCH /api/orders/[id]` | Dashboard admin memperbarui status pesanan dapur dan auto-refresh setiap 10 detik. |
| **Admin: Pengaturan Restoran** | `GET/PUT /api/settings` | Pengaturan persentase pajak, service charge, dan informasi profil warkop/restoran. |

---

### 1.2. Masalah & Celah Keamanan yang Ditemukan (Sebelum Revisi)
1. **Celah Keamanan Kritis pada Perhitungan Harga (`POST /api/orders`)**:
   - Sebelumnya, backend secara langsung mempercayai nilai `subtotal`, `taxAmount`, `serviceChargeAmount`, dan `total` yang dikirim dari payload browser/klien.
   - Penyerang (*attacker*) dapat memanipulasi nilai `total: 1000` di browser dan backend menyimpannya tanpa validasi ulang.
2. **Validasi Keranjang & Meja Kosong**:
   - Backend tidak menolak pesanan jika `items: []` (keranjang kosong).
   - Backend menerima nilai meja kosong atau tidak valid dengan fallback otomatis ke meja 1 tanpa meminta konfirmasi dari pelanggan.
3. **Model QR Code yang Tidak Realistis**:
   - Menggunakan validasi token JWT per-meja di URL (`/table/[tableId]?token=...`). Jika token tidak valid, halaman memblokir pemesanan. Padahal di restoran fisik, QR code biasanya universal atau stiker meja tanpa sistem otentikasi token kompleks yang rentan kedaluwarsa.
4. **Nomor Meja Hardcoded**:
   - Sesi meja di `lib/store.ts` memiliki nilai bawaan default `{ tableId: 'table-5', tableNumber: 5 }`, sehingga header selalu menampilkan "Meja 5" meskipun pelanggan belum memindai meja mereka.
5. **Ketiadaan Struk Digital (*Digital Receipt*)**:
   - Ketika status pesanan mencapai `completed`, halaman pelacakan hanya menampilkan ikon selesai tanpa struk digital berisikan rincian item, pajak, service charge, dan total bayar.
6. **Kurangnya Validasi Input API Admin**:
   - `POST /api/menu`: tidak ada pemeriksaan bahwa `name`, `price`, dan `category` diisi dengan benar.
   - `PUT /api/settings`: tidak ada validasi batasan rentang (0–100%) untuk pajak dan biaya layanan.
   - `POST /api/categories`: tidak ada validasi nama kategori non-kosong.
7. **Duplikasi Kode & Penanganan Error di Frontend**:
   - Fungsi pemformatan rupiah didefinisikan ganda di `lib/format.ts` dan di dalam `FloatingCart.tsx`.
   - Checkout menggunakan `window.alert()` ketika terjadi galat jaringan alih-alih menampilkan pesan error yang ramah di UI.

---

## Bagian 2 — Benchmark vs Sistem Self-Order Mie Gacoan

| Parameter | Standar Mie Gacoan | Kondisi Awal Aplikasi | Status Revisi |
|---|---|---|---|
| **Pola QR Code** | **Universal QR**: Satu QR di meja/restoran yang membuka menu langsung. | QR spesifik per-meja dengan tanda tangan token JWT (`/table/[tableId]?token=...`). | **Diubah ke Universal Entry**: Token JWT dihapus; URL `/table/[id]` hanya mengisi nomor meja secara opsional lalu meneruskan ke menu. |
| **Input Nomor Meja** | Pelanggan memasukkan nomor meja mereka sendiri saat proses checkout. | Nomor meja default otomatis ke Meja 5 (hardcoded di `localStorage`). | **Diperbaiki**: Input nomor meja interaktif wajib diisi saat checkout dengan *advisory warning* jika nomor tidak terdaftar. |
| **Model Pembayaran** | Pesanan dikirim ke sistem kasir/dapur terlebih dahulu; pembayaran dilakukan di kasir fisik (Tunai/EDC/QRIS Kasir). | Sama (pembayaran di kasir). | **Sesuai**: Dipertahankan dengan petunjuk jelas di ringkasan pesanan & struk digital. |
| **Struk Konfirmasi Digital** | Struk digital otomatis muncul saat pesanan selesai/diproses untuk ditunjukkan ke kasir/waiter. | Tidak ada struk digital (hanya progress bar 3 langkah). | **Diimplementasikan**: Menambahkan *Struk Digital* otomatis berisikan rincian item, subtotal, pajak, biaya layanan, dan instruksi bayar. |
| **Otoritas Harga (Server-Side Price Calculation)** | Server menghitung ulang harga dari basis data; browser dilarang menentukan total pembayaran. | Browser mengirimkan total nominal dan dipercaya oleh server. | **Diperbaiki (Kritis)**: Backend menghitung ulang seluruh harga item, add-on, pajak, dan service charge dari database. |

---

## Bagian 3 — Rincian Revisi & Perbaikan yang Telah Dilakukan

### 3.1. Keamanan & Perhitungan Server-Authoritative (`app/api/orders/route.ts`)
- **Penghitungan Ulang Total**: Server mengabaikan seluruh total nominal dari browser. Backend mengambil harga satuan menu dari tabel `MenuItem` dan `Promo`, memvalidasi ketersediaan (`isActive`), memvalidasi harga `addOns`, lalu menghitung `subtotal`.
- **Pajak & Biaya Layanan**: Tarif pajak (`taxRatePercent`) dan biaya layanan (`serviceChargeRatePercent`) diambil langsung dari tabel `Settings` server.
- **Validasi Keranjang**: Permintaan ditolak dengan status HTTP 400 jika array `items` kosong.
- **Validasi Nomor Meja**: Nilai `tableNumber` divalidasi sebagai bilangan bulat positif (> 0).

### 3.2. Penanganan Meja & Pengalaman Pengguna (Universal Flow)
- **`lib/store.ts`**:
  - `getTableSession()` kini mengembalikan `{ tableId: '', tableNumber: 0 }` (menghapus Meja 5 hardcoded).
  - Ditambahkan fungsi pembantu `getManualTableNumber()` dan `saveManualTableNumber()` dengan kunci terpisah `selera_sambal_manual_table`.
  - Fungsi `clearCart()` membersihkan item, catatan, dan nomor meja sesi pesanan.
- **`app/checkout/page.tsx`**:
  - Ditambahkan form input interaktif nomor meja (wajib diisi, tipe angka).
  - Menampilkan pesan *advisory* jika nomor meja belum terdaftar di tabel database restoran, namun tidak memblokir pesanan secara kaku.
  - Mengganti `alert()` browser dengan notifikasi error inline yang ramah.
- **`components/Header.tsx` & `components/FloatingCart.tsx`**:
  - Indikator meja menampilkan teks netral *"Pilih Meja"* ketika pelanggan belum memasukkan nomor meja, dan otomatis berubah menjadi *"Meja X"* saat nomor meja diinput.
  - Menghapus duplikasi fungsi `formatRupiah` dari `FloatingCart.tsx` dan mengimpor dari `lib/format.ts`.
- **`app/table/[tableId]/page.tsx`**:
  - Menghapus pemeriksaan token JWT yang kaku. Halaman kini berfungsi sebagai landing page universal yang menyambut pelanggan, membaca nomor meja dari parameter URL (jika ada), dan mengarahkan ke halaman menu.

### 3.3. Struk Digital Pelanggan (`app/order/[orderId]/page.tsx`)
- Menambahkan langkah ke-4 pada status tracker: **Selesai (Completed)**.
- Ketika pesanan berstatus `completed`, halaman secara otomatis mengambil profil restoran dari `/api/settings` dan merender **Struk Digital**:
  - Header: Nama warkop/restoran, alamat, nomor pesanan (`ARU-XXXX`), nomor meja, tanggal dan jam pesanan.
  - Rincian item: Kuantitas, nama item, level pedas, rincian add-on terpilih, dan subtotal per baris.
  - Rincian biaya: Subtotal, Pajak, Service Charge, dan Grand Total.
  - Catatan pembayaran: "Pembayaran di Kasir (Tunai / EDC)" serta nomor kontak WhatsApp restoran.

### 3.4. Validasi Input API Tambahan (Data Integrity)
- **`app/api/menu/route.ts`**: Validasi `name` non-kosong, `price` angka non-negatif, dan `category` wajib diisi.
- **`app/api/menu/[id]/route.ts`**: Validasi `price >= 0` dan `name` non-kosong saat admin memperbarui menu via PUT.
- **`app/api/settings/route.ts`**: Validasi batas angka 0–100 untuk `taxRatePercent` dan `serviceChargeRatePercent`.
- **`app/api/categories/route.ts`**: Validasi `name` kategori tidak boleh kosong.

---

## Ringkasan Verifikasi
1. ✅ **Security Test**: Manipulasi harga di browser diabaikan; nilai pesanan yang tersimpan di database 100% dihitung dari harga database.
2. ✅ **Empty Order Test**: Checkout dengan keranjang kosong atau nomor meja kosong/0 ditolak baik di frontend maupun oleh API route (HTTP 400).
3. ✅ **Checkout Flow**: Alur mandiri pelanggan berjalan mulus mirip Mie Gacoan (buka menu → pilih item & add-on → masukkan nomor meja saat checkout → kirim pesanan → pantau status → struk digital terbit saat selesai).
