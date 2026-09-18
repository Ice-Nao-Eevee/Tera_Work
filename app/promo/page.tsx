'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, Ticket, Copy, Check, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { IPromo, ICoupon } from '@/lib/types';
import { addToCart } from '@/lib/store';

export default function PromoPage() {
  const [promos, setPromos] = useState<IPromo[]>([]);
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedPromoId, setAddedPromoId] = useState<string | null>(null);

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((current) => (current === code ? null : current));
    }, 2500);
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
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#b45309] to-[#78350f] p-8 md:p-12 text-white shadow-xl mb-12">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Penawaran Spesial Hari Ini
          </div>
          <h1 className="font-serif italic text-3xl md:text-5xl font-bold tracking-tight">
            Promo & Kupon Warkop Betawa
          </h1>
          <p className="text-sm md:text-base text-amber-100/90 leading-relaxed font-light">
            Nikmati sajian khas Betawi dengan harga hemat! Gunakan kupon diskon saat checkout
            atau nikmati paket menu spesial langsung.
          </p>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8c5950]">
          <div className="w-8 h-8 border-4 border-[#b45309] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Memuat penawaran terbaik untuk Anda...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* ── Section 1: Kupon Diskon Checkout ── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e6cdac] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f3e8d6] text-[#b45309] flex items-center justify-center border border-[#d4bc8c]">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#b45309]">
                    Kupon Belanja
                  </h2>
                  <p className="text-xs text-[#735a52]">
                    Salin kode kupon dan masukkan pada halaman checkout sebelum konfirmasi pesanan.
                  </p>
                </div>
              </div>
            </div>

            {coupons.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-[#d4bc8c] text-center space-y-2">
                <p className="font-bold text-[#2a1a15]">Belum ada kupon yang tersedia hari ini.</p>
                <p className="text-xs text-[#735a52]">
                  Kupon mungkin sudah terpakai hari ini atau sedang dalam persiapan. Silakan cek kembali nanti!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((c) => {
                  const isCopied = copiedCode === c.code;
                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl p-6 border border-[#d4bc8c] shadow-card hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Ticket Notch effect decoration */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fcf8f2] border border-[#d4bc8c]" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fcf8f2] border border-[#d4bc8c]" />

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#f3e8d6] text-[#b45309] text-xs font-bold border border-[#d4bc8c]">
                            {c.discountType === 'PERCENTAGE'
                              ? `Diskon ${c.discountValue}%`
                              : `Potongan ${formatRupiah(c.discountValue)}`}
                          </span>
                          <span className="text-[11px] font-semibold text-[#8c5950]">
                            1x Pakai / Hari
                          </span>
                        </div>

                        <div>
                          <h3 className="font-serif font-bold text-lg text-[#2a1a15]">
                            {c.title}
                          </h3>
                          <p className="text-xs text-[#735a52] mt-1 line-clamp-2">
                            {c.description || 'Gunakan kupon ini saat checkout untuk potongan harga.'}
                          </p>
                        </div>

                        <div className="pt-2 text-xs text-[#8c5950] space-y-1 border-t border-dashed border-[#e6cdac]">
                          <div>
                            Min. Belanja: <b>{formatRupiah(c.minOrderAmount)}</b>
                          </div>
                          {c.discountType === 'PERCENTAGE' && c.maxDiscountAmount ? (
                            <div>
                              Maks. Diskon: <b>{formatRupiah(c.maxDiscountAmount)}</b>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Action / Code copy box */}
                      <div className="mt-5 pt-4 border-t border-[#f3e8d6] flex items-center justify-between gap-3">
                        <div className="font-mono font-bold text-sm tracking-wider text-[#b45309] bg-[#fcf8f2] px-3 py-1.5 rounded-xl border border-[#d4bc8c]">
                          {c.code}
                        </div>
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                            isCopied
                              ? 'bg-[#15803d] text-white'
                              : 'bg-[#b45309] hover:bg-[#78350f] text-white'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Kode</span>
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

          {/* ── Section 2: Promo Makanan Spesial ── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e6cdac] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f3e8d6] text-[#b45309] flex items-center justify-center border border-[#d4bc8c]">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#b45309]">
                    Promo Menu Spesial
                  </h2>
                  <p className="text-xs text-[#735a52]">
                    Menu paket hemat dengan harga khusus tanpa perlu memasukkan kode kupon.
                  </p>
                </div>
              </div>
            </div>

            {promos.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-[#d4bc8c] text-center">
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
                      className="bg-white rounded-3xl p-6 border border-[#d4bc8c] shadow-card hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          HEMAT {formatRupiah(p.originalPrice - p.discountedPrice)}
                        </div>
                        <h3 className="font-serif font-bold text-xl text-[#2a1a15]">
                          {p.title}
                        </h3>
                        <p className="text-xs text-[#735a52] leading-relaxed">
                          {p.description}
                        </p>
                        <div className="flex items-baseline gap-2 pt-2">
                          <span className="text-xs line-through text-[#9e8d87]">
                            {formatRupiah(p.originalPrice)}
                          </span>
                          <span className="font-bold text-xl text-[#b45309]">
                            {formatRupiah(p.discountedPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#f3e8d6] flex items-center justify-between">
                        <span className="text-xs text-[#8c5950] font-medium">
                          Porsi Terbatas
                        </span>
                        <button
                          onClick={() => handleAddPromoToCart(p)}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                            isAdded
                              ? 'bg-[#15803d] text-white'
                              : 'bg-[#b45309] hover:bg-[#78350f] text-white'
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

          {/* Quick link back to menu */}
          <div className="text-center pt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#2a1a15] hover:bg-[#b45309] text-white text-sm font-semibold transition-colors shadow-md"
            >
              <span>Lihat Semua Menu Makanan & Minuman</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
