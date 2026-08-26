import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDB, getMemoryStore, INITIAL_MENU_ITEMS, INITIAL_PROMOS } from '@/lib/db';
import { MenuItemModel, IMenuItem } from '@/lib/models';
import { formatRupiah } from '@/lib/format';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Lightweight menu retrieval: match query terms against menu items
    await connectDB();
    let menuItems: IMenuItem[] = [];

    if (process.env.MONGODB_URI) {
      try {
        const searchRegex = new RegExp(lastUserMessage.split(' ').filter((w: string) => w.length > 2).join('|'), 'i');
        menuItems = await MenuItemModel.find({
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
          ],
        }).limit(5).lean();
      } catch (err) {
        // Fallback to memory
      }
    }

    if (!menuItems || menuItems.length === 0) {
      const store = getMemoryStore();
      const terms = lastUserMessage.toLowerCase().split(' ');
      menuItems = store.menuItems
        .filter((item) =>
          terms.some(
            (t: string) =>
              t.length > 2 &&
              (item.name.toLowerCase().includes(t) ||
                item.description.toLowerCase().includes(t) ||
                item.category.toLowerCase().includes(t))
          )
        )
        .slice(0, 5);

      if (menuItems.length === 0) {
        menuItems = store.menuItems.slice(0, 4); // Default top 4 items context
      }
    }

    // Build concise menu context string
    const menuContext = menuItems
      .map(
        (m) =>
          `- ${m.name} (${formatRupiah(m.price)}): ${m.description}. Badge: ${m.badge || 'none'
          }. Addons: ${m.addOns.map((a) => a.label).join(', ') || 'tidak ada'}`
      )
      .join('\n');

    const systemPrompt = `Anda adalah Asisten AI "Selera Sambal", restoran kuliner khas Nusantara yang terkenal dengan sambal uleknya.
Tugas Anda:
1. Jawab pertanyaan seputar menu makanan/minuman, tingkat kepedasan, rekomendasi hidangan, promo, dan info dine-in.
2. Gunakan Bahasa Indonesia yang ramah, sopan, dan hangat.
3. Jawab secara ringkas dan padat.
4. JIKA pertanyaan di luar topik kuliner Selera Sambal (misal: sains, berita politik, coding, dll), TOLAK DENGAN SOPAN dan sarankan untuk menghubungi pelayan atau WhatsApp kami (+6281234567890).

Menu Relevan Hari Ini:
${menuContext}
    `;

    // Trim history to last 6 messages
    const trimmedMessages = messages.slice(-6);

    // Call Gemini API if API key available, otherwise provide standard fallback response
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Convert format for Gemini SDK
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...trimmedMessages.map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
      ];

      const result = await model.generateContent({ contents });
      const responseText = result.response.text();

      return NextResponse.json({ reply: responseText });
    }

    // Intelligent fallback responses when GEMINI_API_KEY is not set
    let fallbackReply = `Selamat datang di Selera Sambal! 🌶️ Ada yang bisa saya bantu terkait menu hidangan, rekomendasi sambal, atau info pemesanan meja Anda?`;

    const lower = lastUserMessage.toLowerCase();
    if (lower.includes('rekomendasi') || lower.includes('paling enak') || lower.includes('favorit')) {
      fallbackReply = `Rekomendasi terbaik kami hari ini adalah **Nasi Goreng Spesial** (Rp 45.000) dengan bumbu rempah warisan dan sate ayam, serta **Sate Ayam Madura** (Rp 38.000) dengan bumbu kacang gurih manis. Selamat mencoba! 🌶️`;
    } else if (lower.includes('pedas') || lower.includes('sambal')) {
      fallbackReply = `Semua makanan utama kami bisa Anda atur tingkat kepedasannya: **Tidak Pedas**, **Sedang**, atau **Pedas**. Sambal ulek kami dibuat fresh setiap hari dari cabai rawit pilihan!`;
    } else if (lower.includes('minum') || lower.includes('es teh')) {
      fallbackReply = `Untuk minuman menyegarkan, kami merekomendasikan **Es Teh Manis** racikan daun teh hitam istimewa seharga Rp 12.000.`;
    } else if (lower.includes('jam') || lower.includes('buka') || lower.includes('lokasi')) {
      fallbackReply = `Selera Sambal buka setiap hari pukul 10:00 - 22:00 WIB. Lokasi kami di Jl. Nusantara No. 14, Jakarta.`;
    }

    return NextResponse.json({ reply: fallbackReply });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return NextResponse.json(
      { reply: 'Maaf, terjadi kendala koneksi dengan Asisten AI. Silakan tanyakan langsung ke staf pelayan kami ya! 🌶️' },
      { status: 200 }
    );
  }
}
