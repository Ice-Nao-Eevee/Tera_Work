'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tag,
  Ticket,
  Copy,
  Check,
  ArrowRight,
  Percent,
  Clock,
  ShoppingBag,
  Gift,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { IPromo, ICoupon } from '@/lib/types';
import { addToCart, getCartItems } from '@/lib/store';

export default function PromoPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<IPromo[]>([]);
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedPromoId, setAddedPromoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    code: string;
    linkUrl: string;
    linkLabel: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/promos').then((r) => r.json()).catch(() => ({ promos: [] })),
      fetch('/api/coupons').then((r) => r.json()).catch(() => ({ coupons: [] })),
    ])
      .then(([promoData, couponData]) => {
        setPromos(promoData.promos || []);
        setCoupons(couponData.coupons || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto dismiss toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);

    try {
      sessionStorage.setItem('wkb_selected_coupon', code);
    } catch (_) {}

    const cart = getCartItems();
    if (cart.length > 0) {
      setToastMessage({
        text: `Kode "${code}" berhasil disalin! Kupon siap dipakai saat checkout.`,
        code,
        linkUrl: '/checkout',
        linkLabel: 'Buka Checkout 🛒',
      });
    } else {
      setToastMessage({
        text: `Kode "${code}" berhasil disalin! Silakan pilih hidangan favorit Anda.`,
        code,
        linkUrl: '/menu',
        linkLabel: 'Pilih Menu ☕',
      });
    }

    setTimeout(() => {
      setCopiedCode((current) => (current === code ? null : current));
    }, 2800);
  };

  const handleUseCoupon = (code: string) => {
    handleCopyCode(code);
    const cart = getCartItems();
    if (cart.length > 0) {
      router.push('/checkout');
    } else {
      router.push('/menu');
    }
  };

  const handleAddPromoToCart = (promo: IPromo) => {
    const promoId = promo.id || promo._id || 'promo';
    const promoMenuItem = {
      id: `promo_${promoId}`,
      _id: `promo_${promoId}`,
      name: promo.title,
      description: promo.description,
      price: promo.discountedPrice,
      category: 'makanan',
      photoUrl:
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    };
    addToCart(promoMenuItem as any, 1);
    setAddedPromoId(promoId);
    setTimeout(() => setAddedPromoId(null), 2000);
  };

  return (
    <div className="bg-[#f5ede2] min-h-screen py-8">
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        {/* ── Banner / Hero Section (Tema Kayu & Kopi Betawi Alami) ── */}
        <div className="relative overflow-hidden rounded-3xl bg-[#361c12] p-8 md:p-12 text-[#fbf5eb] shadow-lg mb-10 border-2 border-[#542d1e]">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4e2a1d] text-xs font-bold tracking-wide uppercase text-amber-300 border border-[#6b3c2a] shadow-xs">
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
              <span>Voucher Resmi Warkop Betawa</span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#fbf5eb] leading-tight">
              Promo & Kupon Belanja Betawi
            </h1>
            <p className="text-sm md:text-base text-[#eeddc5] leading-relaxed font-normal max-w-2xl">
              Nikmati racikan kopi mantap dan hidangan khas Betawi dengan harga lebih hemat! Gunakan kupon diskon harian saat checkout atau nikmati menu promo spesial langsung.
            </p>

            {/* Sorotan nilai autentik */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[#f5ebd8]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a150e] border border-[#542d1e]">
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                Voucher Kuota Harian
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a150e] border border-[#542d1e]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Reset Otomatis Pukul 00:00
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a150e] border border-[#542d1e]">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                Potongan Langsung di Kasir
              </span>
            </div>
          </div>

          {/* Aksen ornamen natural warkop */}
          <div className="absolute right-4 bottom-2 opacity-10 pointer-events-none">
            <Coffee className="w-64 h-64 text-amber-200" />
          </div>
        </div>

        {/* ── 3-Langkah Panduan Kupon (Kertas Kraft / Krem Warkop Alami) ── */}
        <div className="mb-12 bg-[#ebdcc8] rounded-3xl p-6 border-2 border-[#cfb28d] shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-[#361c12] text-amber-300 flex items-center justify-center shadow-md shrink-0 border border-[#542d1e]">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2a1a15]">
                  Cara Menggunakan Kupon
                </h3>
                <p className="text-xs text-[#63483f]">
                  3 langkah simpel untuk menikmati potongan harga spesial
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full lg:w-auto flex-1 max-w-3xl">
              <div className="bg-[#f8f1e5] p-4 rounded-2xl border border-[#d6be9c] flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#361c12] text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <span className="text-xs font-bold text-[#2a1a15] block">Pilih Voucher</span>
                  <span className="text-[11px] text-[#63483f] leading-tight">Cek minimal belanja & potongan diskon</span>
                </div>
              </div>

              <div className="bg-[#f8f1e5] p-4 rounded-2xl border border-[#d6be9c] flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#361c12] text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="text-xs font-bold text-[#2a1a15] block">Salin / Pakai</span>
                  <span className="text-[11px] text-[#63483f] leading-tight">Salin kode atau klik langsung Pakai Kupon</span>
                </div>
              </div>

              <div className="bg-[#f8f1e5] p-4 rounded-2xl border border-[#d6be9c] flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#361c12] text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="text-xs font-bold text-[#2a1a15] block">Hemat di Checkout</span>
                  <span className="text-[11px] text-[#63483f] leading-tight">Otomatis terpotong pada total belanja</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8c5950]">
            <div className="w-10 h-10 border-4 border-[#b45309] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold">Menyiapkan kupon dan promo terbaik untuk Anda...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* ── Section 1: Kupon Diskon Belanja ── */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-[#d6be9c] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#ebdcc8] text-[#361c12] flex items-center justify-center border border-[#cfb28d] shadow-xs">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#361c12]">
                        Kupon Belanja
                      </h2>
                      {coupons.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#361c12] text-amber-300 text-[11px] font-bold border border-[#542d1e]">
                          {coupons.length} Aktif Hari Ini
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#63483f] mt-0.5 font-medium">
                      Gunakan kode kupon di bawah ini pada halaman checkout sebelum konfirmasi pesanan.
                    </p>
                  </div>
                </div>
              </div>

              {coupons.length === 0 ? (
                <div className="p-10 rounded-3xl bg-[#fbf5eb] border-2 border-[#d5be9b] text-center space-y-3 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-[#ebdcc8] text-[#361c12] flex items-center justify-center mx-auto border border-[#cfb28d]">
                    <Ticket className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-lg text-[#2a1a15]">Belum ada kupon yang tersedia hari ini.</p>
                  <p className="text-xs text-[#63483f] max-w-md mx-auto leading-relaxed">
                    Kupon mungkin sudah terpakai hari ini atau sedang dalam persiapan promo harian. Kupon akan otomatis aktif kembali pukul 00:00!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {coupons.map((c) => {
                    const isCopied = copiedCode === c.code;
                    const isPercent = c.discountType === 'PERCENTAGE';

                    return (
                      <div
                        key={c.id}
                        className="group relative bg-[#fbf5eb] rounded-3xl border-2 border-[#d5be9b] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                      >
                        {/* ── Top Header Voucher Stub (Kopi Hitam Pekat & Emas Vintage) ── */}
                        <div className="relative bg-[#361c12] p-6 text-[#fbf5eb] overflow-hidden border-b border-[#4d281a]">
                          {/* Top Badges */}
                          <div className="relative z-10 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4e2a1d] text-[11px] font-bold tracking-wide uppercase text-amber-300 border border-[#6b3c2a] shadow-xs">
                              {isPercent ? (
                                <>
                                  <Percent className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Diskon Persentase</span>
                                </>
                              ) : (
                                <>
                                  <Gift className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Potongan Langsung</span>
                                </>
                              )}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#24130c] px-2.5 py-1 rounded-full text-[#eeddc5] border border-[#4d281a]">
                              <Clock className="w-3 h-3 text-amber-300" />
                              <span>1x Pakai / Hari</span>
                            </span>
                          </div>

                          {/* Sorotan Nilai Diskon Besar */}
                          <div className="relative z-10 mt-4">
                            {isPercent ? (
                              <div className="flex items-baseline gap-2">
                                <span className="font-serif italic font-extrabold text-5xl text-amber-300 tracking-tight drop-shadow-sm">
                                  {c.discountValue}%
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-200">
                                    OFF
                                  </span>
                                  <span className="text-[11px] text-[#eeddc5] font-medium">
                                    Semua Menu Warkop
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-serif italic text-amber-300 font-bold">
                                  Rp
                                </span>
                                <span className="font-serif italic font-extrabold text-4xl sm:text-5xl text-amber-300 tracking-tight drop-shadow-sm">
                                  {c.discountValue.toLocaleString('id-ID')}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-200">
                                    HEMAT
                                  </span>
                                  <span className="text-[11px] text-[#eeddc5] font-medium">
                                    Potongan Langsung
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Perforasi Coakan Tiket (Warna background pas menyatu dengan halaman) ── */}
                        <div className="relative py-2.5 bg-[#fbf5eb] flex items-center justify-between">
                          {/* Coakan kiri */}
                          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f5ede2] border-2 border-[#d5be9b] z-10 shadow-[inset_-2px_0_4px_rgba(42,26,21,0.12)]" />
                          {/* Garis putus-putus perforasi */}
                          <div className="w-full border-t-2 border-dashed border-[#c4a47c] mx-6" />
                          {/* Coakan kanan */}
                          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f5ede2] border-2 border-[#d5be9b] z-10 shadow-[inset_2px_0_4px_rgba(42,26,21,0.12)]" />
                        </div>

                        {/* ── Isi Tiket & Syarat Ketentuan (Kertas Kraft Vintage) ── */}
                        <div className="p-6 pt-1 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-serif font-bold text-xl text-[#2a1a15] group-hover:text-[#b45309] transition-colors leading-snug">
                                {c.title}
                              </h3>
                              <p className="text-xs text-[#63483f] mt-1.5 leading-relaxed line-clamp-2">
                                {c.description || 'Gunakan kupon ini saat checkout untuk potongan harga hemat.'}
                              </p>
                            </div>

                            {/* Kotak Syarat & Ketentuan */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                              <div className="bg-[#eeddc5] p-2.5 rounded-xl border border-[#d8be9a] flex flex-col justify-center">
                                <span className="text-[10px] uppercase font-bold text-[#63483f] tracking-wider">
                                  Min. Belanja
                                </span>
                                <span className="font-bold text-[#2a1a15] text-xs sm:text-sm mt-0.5">
                                  {formatRupiah(c.minOrderAmount)}
                                </span>
                              </div>

                              {isPercent && c.maxDiscountAmount ? (
                                <div className="bg-[#eeddc5] p-2.5 rounded-xl border border-[#d8be9a] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase font-bold text-[#63483f] tracking-wider">
                                    Maks. Diskon
                                  </span>
                                  <span className="font-bold text-[#b45309] text-xs sm:text-sm mt-0.5">
                                    {formatRupiah(c.maxDiscountAmount)}
                                  </span>
                                </div>
                              ) : (
                                <div className="bg-[#eeddc5] p-2.5 rounded-xl border border-[#d8be9a] flex flex-col justify-center">
                                  <span className="text-[10px] uppercase font-bold text-[#63483f] tracking-wider">
                                    Status Kupon
                                  </span>
                                  <span className="font-bold text-[#15803d] text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                                    Siap Dipakai
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Wadah Kode Kupon & Tombol Aksi ── */}
                          <div className="pt-3 space-y-2.5 border-t border-[#e2cca9]">
                            {/* Kotak Kode Bergaris Putus-putus */}
                            <div className="bg-[#ebd8be] border-2 border-dashed border-[#b4844c] rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all">
                              <div className="flex items-center gap-2 pl-2">
                                <Ticket className="w-4 h-4 text-[#361c12] shrink-0" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] uppercase tracking-wider text-[#63483f] font-bold">
                                    Kode Kupon
                                  </span>
                                  <span className="font-mono font-extrabold text-base sm:text-lg text-[#2a1a15] tracking-wider select-all">
                                    {c.code}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleCopyCode(c.code)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 ${
                                  isCopied
                                    ? 'bg-[#15803d] text-white ring-2 ring-emerald-400'
                                    : 'bg-[#b45309] hover:bg-[#8f3e04] text-white'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span>Salin Kode</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Tombol Langsung Pakai Kupon */}
                            <button
                              onClick={() => handleUseCoupon(c.code)}
                              className="w-full py-2.5 px-3 text-xs font-bold text-[#361c12] hover:text-white bg-[#eeddc5] hover:bg-[#b45309] border border-[#cfb28d] hover:border-transparent rounded-xl transition-all flex items-center justify-center gap-1.5 group/btn shadow-xs"
                            >
                              <span>Gunakan Kupon Ini Sekarang</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Section 2: Promo Menu Spesial ── */}
            <section className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#d6be9c]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#ebdcc8] text-[#361c12] flex items-center justify-center border border-[#cfb28d] shadow-xs">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#361c12]">
                      Promo Menu Spesial
                    </h2>
                    <p className="text-xs text-[#63483f] font-medium">
                      Menu paket hemat dengan harga khusus tanpa perlu memasukkan kode kupon.
                    </p>
                  </div>
                </div>
              </div>

              {promos.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#fbf5eb] border-2 border-[#d5be9b] text-center shadow-sm">
                  <p className="font-bold text-[#2a1a15]">Belum ada promo menu saat ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {promos.map((p) => {
                    const pId = p.id || p._id || 'promo';
                    const isAdded = addedPromoId === pId;

                    return (
                      <div
                        key={pId}
                        className="group bg-[#fbf5eb] rounded-3xl p-6 border-2 border-[#d5be9b] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7a2318] text-white text-xs font-bold border border-[#5c1a11]">
                            HEMAT {formatRupiah(p.originalPrice - p.discountedPrice)}
                          </div>
                          <h3 className="font-serif font-bold text-xl text-[#2a1a15] group-hover:text-[#b45309] transition-colors">
                            {p.title}
                          </h3>
                          <p className="text-xs text-[#63483f] leading-relaxed line-clamp-3">
                            {p.description}
                          </p>
                          <div className="flex items-baseline gap-2.5 pt-2">
                            <span className="text-xs line-through text-[#8c746b]">
                              {formatRupiah(p.originalPrice)}
                            </span>
                            <span className="font-bold text-2xl text-[#b45309]">
                              {formatRupiah(p.discountedPrice)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#e2cca9] flex items-center justify-between">
                          <span className="text-xs text-[#63483f] font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#b45309]" />
                            Porsi Terbatas
                          </span>
                          <button
                            onClick={() => handleAddPromoToCart(p)}
                            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 ${
                              isAdded
                                ? 'bg-[#15803d] text-white'
                                : 'bg-[#b45309] hover:bg-[#8f3e04] text-white'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Ditambahkan</span>
                              </>
                            ) : (
                              <>
                                <span>Pesan Promo</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Tombol kembali ke menu */}
            <div className="text-center pt-4">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#361c12] hover:bg-[#b45309] text-[#fbf5eb] text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:scale-102 border border-[#542d1e]"
              >
                <span>Lihat Semua Menu Makanan & Minuman</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Floating Notification Toast ── */}
        {toastMessage && (
          <div className="fixed bottom-6 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] bg-[#2a150e] text-[#fbf5eb] p-4 rounded-2xl shadow-xl border-2 border-[#b45309] flex items-center justify-between gap-3 animate-fade-in transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#fbf5eb]">
                  {toastMessage.text}
                </p>
                <span className="text-[10px] text-amber-300 block mt-0.5">
                  Kupon siap diaplikasikan pada pesanan Anda
                </span>
              </div>
            </div>
            {toastMessage.linkUrl && (
              <Link
                href={toastMessage.linkUrl}
                className="px-3.5 py-1.5 rounded-xl bg-[#b45309] hover:bg-[#8f3e04] text-white font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 shadow-xs"
              >
                <span>{toastMessage.linkLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
