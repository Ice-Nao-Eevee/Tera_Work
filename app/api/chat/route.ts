import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { formatRupiah } from '@/lib/format';
import prisma from '@/lib/prisma';

// â”€â”€ Badge translation map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BADGE_LABEL: Record<string, string> = {
  best_seller: 'â­ Best Seller',
  chefs_choice: 'ðŸ‘¨â€ðŸ³ Chef\'s Choice',
  new: 'ðŸ†• Menu Baru',
  vegan_friendly: 'ðŸŒ¿ Vegan Friendly',
  spicy: 'ðŸŒ¶ï¸ Ekstra Pedas',
  none: '',
};

// â”€â”€ System Prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SYSTEM_PROMPT_TEMPLATE = `Kamu adalah asisten virtual "Kopi" untuk Warkop Betawa (Selera Sambal), warung makan khas Nusantara di Jakarta.

INFO WARUNG:
- Nama: Warkop Betawa (Selera Sambal)
- Alamat: Jl. Nusantara No. 14, Jakarta
- Jam buka: Setiap hari 10:00 - 22:00 WIB
- WhatsApp: +6281234567890
- Instagram: @selerasambal
- Sistem pemesanan: Dine-in via scan QR di meja

CARA MEMESAN:
1. Scan QR code di meja â†’ otomatis masuk ke halaman menu
2. Pilih menu yang diinginkan, pilih level pedas & add-on jika ada
3. Klik "Tambah ke Keranjang" â†’ buka keranjang â†’ isi nomor meja
4. Klik "Checkout & Pesan" â†’ pesanan langsung masuk ke dapur

TUGASMU: Membantu pelanggan dengan pertanyaan seputar menu, harga, promo, kupon, cara memesan, jam buka, dan lokasi.

ATURAN WAJIB:
1. Jawab HANYA berdasarkan data menu/promo yang ada di bagian DATA di bawah ini.
   DILARANG KERAS mengarang nama menu, harga, atau promo yang tidak ada di data.
2. Jika informasi tidak ada di data, akui dengan jujur dan sarankan tanya kasir.
3. Tolak pertanyaan di luar topik warung (politik, coding, sains, dll) dengan sopan.
4. Format jawaban:
   - Singkat & padat (2-3 kalimat atau bullet list pendek)
   - Gunakan bullet list jika menyebut lebih dari 2 item
   - Sebutkan harga dengan format "Rp XX.000"
   - Boleh 1 emoji per pesan, jangan berlebihan
5. Gaya bahasa: santai, hangat, ramah ala warkop Betawi. Bahasa Indonesia.
6. Kamu TIDAK BISA memproses pesanan atau tambah item ke keranjang â€” arahkan user ke halaman menu.
7. Jika ditanya level pedas: semua makanan utama tersedia dalam Tidak Pedas, Sedang, dan Pedas.
8. Jika ditanya add-on: sebutkan nama dan harga tambahan dari data.

DATA MENU, PROMO & KUPON (gunakan ini sebagai satu-satunya sumber kebenaran):
{context_data}`;

// â”€â”€ Fetch relevant menu, promo & coupon data from Prisma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getRelevantMenuAndPromoData(message: string) {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  try {
    let menuItems: Array<{
      name: string;
      description: string;
      price: number;
      category: string;
      badge: string;
      addOns: any;
    }> = [];

    if (terms.length > 0) {
      const orConditions = terms.flatMap((t) => [
        { name: { contains: t, mode: 'insensitive' as const } },
        { description: { contains: t, mode: 'insensitive' as const } },
        { category: { contains: t, mode: 'insensitive' as const } },
      ]);

      menuItems = await prisma.menuItem.findMany({
        where: { OR: orConditions, isActive: true },
        select: { name: true, description: true, price: true, category: true, badge: true, addOns: true },
        take: 10,
      });
    }

    // If no keyword match, fall back to all active items (small menu)
    if (menuItems.length === 0) {
      menuItems = await prisma.menuItem.findMany({
        where: { isActive: true },
        select: { name: true, description: true, price: true, category: true, badge: true, addOns: true },
      });
    }

    // Active promos
    const promos = await prisma.promo.findMany({
      where: { isActive: true },
      select: { title: true, description: true, originalPrice: true, discountedPrice: true },
    });

    // Active coupons (within validity period)
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      select: {
        code: true,
        title: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
      },
    });

    return {
      menu: menuItems.map((m) => ({
        nama: m.name,
        harga: formatRupiah(m.price),
        deskripsi: m.description,
        kategori: m.category === 'makanan' ? 'Makanan Utama'
          : m.category === 'minuman' ? 'Minuman'
          : m.category === 'cemilan' ? 'Cemilan'
          : m.category === 'dessert' ? 'Dessert'
          : m.category,
        label: BADGE_LABEL[m.badge] || undefined,
        tingkat_pedas: Array.isArray(m.addOns)
          ? undefined  // spiceLevels handled separately
          : undefined,
        pilihan_level_pedas: (() => {
          // spiceLevels stored as JSON array on menuItem â€” not selected here
          // Default for all food items
          return m.category !== 'minuman' && m.category !== 'dessert'
            ? 'Tidak Pedas / Sedang / Pedas'
            : undefined;
        })(),
        tambahan_tersedia: Array.isArray(m.addOns) && (m.addOns as any[]).length > 0
          ? (m.addOns as any[]).map((a: any) =>
              a.price > 0 ? `${a.label} (+${formatRupiah(a.price)})` : a.label
            ).join(', ')
          : undefined,
      })),
      promo_aktif: promos.map((p) => ({
        judul: p.title,
        deskripsi: p.description,
        harga_normal: formatRupiah(p.originalPrice),
        harga_promo: formatRupiah(p.discountedPrice),
        hemat: formatRupiah(p.originalPrice - p.discountedPrice),
      })),
      kupon_aktif: coupons.map((c) => ({
        kode_kupon: c.code,
        nama: c.title,
        keterangan: c.description,
        diskon: c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatRupiah(c.discountValue),
        minimal_belanja: formatRupiah(c.minOrderAmount),
        maks_potongan: c.maxDiscountAmount ? formatRupiah(c.maxDiscountAmount) : 'tidak ada batas',
        cara_pakai: 'Masukkan kode kupon saat checkout di kolom "Kode Promo"',
      })),
    };
  } catch (err) {
    // Fallback to in-memory static data
    const store = getMemoryStore();
    const filtered =
      terms.length > 0
        ? store.menuItems.filter((item) =>
            terms.some(
              (t) =>
                item.name.toLowerCase().includes(t) ||
                item.description.toLowerCase().includes(t) ||
                item.category.toLowerCase().includes(t)
            )
          )
        : store.menuItems;

    const menuItems = (filtered.length > 0 ? filtered : store.menuItems).slice(0, 12);

    return {
      menu: menuItems.map((m) => ({
        nama: m.name,
        harga: formatRupiah(m.price),
        deskripsi: m.description,
        kategori: m.category === 'makanan' ? 'Makanan Utama'
          : m.category === 'minuman' ? 'Minuman'
          : m.category === 'dessert' ? 'Dessert'
          : m.category,
        label: BADGE_LABEL[m.badge ?? 'none'] || undefined,
        pilihan_level_pedas: m.spiceLevels && m.spiceLevels.length > 0
          ? m.spiceLevels.map((s: any) => s.label).join(' / ')
          : undefined,
        tambahan_tersedia: m.addOns && m.addOns.length > 0
          ? m.addOns.map((a: any) =>
              a.price > 0 ? `${a.label} (+${formatRupiah(a.price)})` : a.label
            ).join(', ')
          : undefined,
      })),
      promo_aktif: store.promos
        .filter((p) => p.isActive)
        .map((p) => ({
          judul: p.title,
          deskripsi: p.description,
          harga_normal: formatRupiah(p.originalPrice),
          harga_promo: formatRupiah(p.discountedPrice),
          hemat: formatRupiah(p.originalPrice - p.discountedPrice),
        })),
      kupon_aktif: [],
    };
  }
}

// â”€â”€ Route Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateSmartFallback(userMessage: string, relevantData: any): string {
  const lower = userMessage.toLowerCase();

  // Recommendations / Menu favorites
  if (
    lower.includes('rekomendasi') ||
    lower.includes('favorit') ||
    lower.includes('enak') ||
    lower.includes('best') ||
    lower.includes('saran')
  ) {
    const bestSellers = (relevantData.menu || []).filter(
      (m: any) => m.label && (m.label.includes('Best Seller') || m.label.includes('Chef'))
    );
    const items = bestSellers.length > 0 ? bestSellers : (relevantData.menu || []).slice(0, 3);
    const listStr = items
      .map(
        (m: any) =>
          `- **${m.nama}** (${m.harga}): ${m.deskripsi || 'Menu spesial pilihan pengunjung'}`
      )
      .join('\n');
    return `Berikut rekomendasi menu favorit di Warkop Betawa:\n\n${listStr}\n\nAda yang mau dicoba? Tinggal pilih di menu dan masukkan ke keranjang ya! 😊`;
  }

  // Promo & Diskon
  if (
    lower.includes('promo') ||
    lower.includes('diskon') ||
    lower.includes('potongan') ||
    lower.includes('hemat')
  ) {
    if (relevantData.promo_aktif && relevantData.promo_aktif.length > 0) {
      const promoList = relevantData.promo_aktif
        .map(
          (p: any) =>
            `- **${p.judul}**: Cuma ${p.harga_promo} (Hemat ${p.hemat}, normal ${p.harga_normal})`
        )
        .join('\n');
      return `Kabar baik! Saat ini kami ada promo aktif:\n\n${promoList}\n\nYuk buruan pesan sebelum kehabisan! ✨`;
    }
    return 'Saat ini belum ada promo paket khusus, tapi pantau terus halaman Promo kami ya! Ada juga kupon diskon yang bisa kamu pakai saat checkout. 😊';
  }

  // Kupon / Voucher
  if (lower.includes('kupon') || lower.includes('voucher') || lower.includes('kode')) {
    if (relevantData.kupon_aktif && relevantData.kupon_aktif.length > 0) {
      const kuponList = relevantData.kupon_aktif
        .map(
          (c: any) =>
            `- Kode **${c.kode_kupon}** (${c.nama}): Diskon ${c.diskon} (Min. belanja ${c.minimal_belanja})`
        )
        .join('\n');
      return `Kamu bisa gunakan kupon diskon berikut saat checkout:\n\n${kuponList}\n\nMasukkan kodenya di kolom "Kode Promo" sebelum bayar ya! 🎟️`;
    }
    return 'Belum ada kupon aktif saat ini. Cek berkala di halaman checkout ya! 😊';
  }

  // Menu / Makanan / Minuman / Harga
  if (
    lower.includes('menu') ||
    lower.includes('makan') ||
    lower.includes('minum') ||
    lower.includes('harga') ||
    lower.includes('daftar')
  ) {
    const sample = (relevantData.menu || []).slice(0, 5);
    const sampleStr = sample
      .map((m: any) => `- **${m.nama}** - ${m.harga} (${m.kategori})`)
      .join('\n');
    return `Warkop Betawa menyajikan berbagai pilihan makanan, minuman, dan cemilan lezat! Beberapa di antaranya:\n\n${sampleStr}\n\nSilakan cek daftar menu lengkap langsung di layar pesananmu ya! 🍜🍹`;
  }

  // Pedas / Sambal / Level
  if (
    lower.includes('pedas') ||
    lower.includes('sambal') ||
    lower.includes('level') ||
    lower.includes('cabe')
  ) {
    return 'Untuk menu makanan kami, kamu bisa bebas memilih tingkat kepedasan: **Tidak Pedas**, **Sedang**, atau **Pedas**! Sambal kami dibuat ulek fresh tiap hari khas Warkop Betawa 🌶️🔥';
  }

  // Cara Pesan / Order
  if (
    lower.includes('pesan') ||
    lower.includes('order') ||
    lower.includes('cara') ||
    lower.includes('bayar')
  ) {
    return 'Cara pesan makanan di Warkop Betawa gampang banget:\n1. Pastikan kamu sudah scan QR meja\n2. Pilih menu favoritmu & atur level pedas / topping\n3. Masukkan ke keranjang dan checkout\n4. Makanan akan langsung diantar hangat ke mejamu! 🚀';
  }

  // Jam Buka / Lokasi
  if (
    lower.includes('jam') ||
    lower.includes('buka') ||
    lower.includes('tutup') ||
    lower.includes('lokasi') ||
    lower.includes('alamat')
  ) {
    return 'Warkop Betawa buka **setiap hari pukul 10:00 - 22:00 WIB**. Silakan nikmati santap santai bareng teman dan keluarga! ☕';
  }

  // General greeting / fallback
  return 'Halo! Saya Asisten Warkop Betawa ☕. Saya siap bantu kamu cari rekomendasi menu, info promo & kupon diskon, atau panduan cara memesan. Mau tanya apa nih? 😊';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both { message, history } and legacy { messages } formats
    const isLegacy = Array.isArray(body.messages);
    const userMessage: string = isLegacy
      ? (body.messages[body.messages.length - 1]?.content ?? '').trim()
      : (body.message ?? '').trim();
    const history: Array<{ role: string; content: string }> = isLegacy
      ? body.messages.slice(0, -1)
      : (body.history ?? []);

    if (!userMessage) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Ensure DB is seeded
    await connectDB();

    // Fetch relevant context data
    const relevantData = await getRelevantMenuAndPromoData(userMessage);

    // Build system prompt with context injected
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
      '{context_data}',
      JSON.stringify(relevantData, null, 2)
    );

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.warn('GROQ_API_KEY not set, falling back to smart responder');
      return NextResponse.json({ reply: generateSmartFallback(userMessage, relevantData) });
    }

    // Build Groq messages array (OpenAI-compatible format)
    // System prompt as first message with role "system"
    const trimmedHistory = history.slice(-6);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    // Call Groq API (OpenAI-compatible, server-side only — key never exposed to client)
    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq API error:', groqData);
      return NextResponse.json(
        { reply: 'Maaf, ada gangguan. Coba tanya kasir ya.' },
        { status: 500 }
      );
    }

    const reply =
      groqData.choices?.[0]?.message?.content ??
      'Maaf, ada gangguan. Coba tanya kasir ya.';

    return NextResponse.json({ reply });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return NextResponse.json({
        reply: 'Asisten AI tidak merespons (timeout). Coba lagi atau tanya langsung ke kasir ya ☕',
      });
    }
    console.error('Error in /api/chat:', err);
    return NextResponse.json({
      reply: 'Halo! Saya Asisten Warkop Betawa ☕. Ada yang bisa saya bantu seputar menu, promo, atau cara memesan? 😊',
    });
  }
}



// â”€â”€ GET: Diagnostics endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Usage: curl http://localhost:3000/api/chat
export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  const hasKey = !!(apiKey && apiKey.trim().length > 10);

  if (!hasKey) {
    return NextResponse.json({
      status: 'no_api_key',
      connected: false,
      message: 'GROQ_API_KEY tidak ditemukan atau kosong di .env / .env.local',
      fix: 'Tambahkan GROQ_API_KEY=gsk_... ke file .env.local lalu restart dev server',
      guide: 'https://console.groq.com/keys',
    });
  }

  // Ping Groq API with a minimal request
  try {
    const pingRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: 'halo' }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (pingRes.ok) {
      return NextResponse.json({
        status: 'connected',
        connected: true,
        model: 'openai/gpt-oss-20b',
        provider: 'Groq',
        message: 'âœ… Groq API aktif dan siap digunakan',
      });
    }

    const errBody = await pingRes.json().catch(() => ({}));
    console.error('Groq diagnostic ping error:', pingRes.status, errBody);
    return NextResponse.json({
      status: 'api_error',
      connected: false,
      httpStatus: pingRes.status,
      detail: JSON.stringify(errBody).slice(0, 500),
      fix: pingRes.status === 401 ? 'API key tidak valid atau expired' : 'Cek rate limit/quota di console.groq.com',
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'network_error',
      connected: false,
      error: e?.message ?? 'Unknown error',
    });
  }
}


