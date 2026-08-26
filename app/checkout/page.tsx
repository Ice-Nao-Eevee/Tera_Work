'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Utensils, Tag, Plus, Check, ArrowRight } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import {
  getCartItems,
  getTableSession,
  getOrderNotes,
  clearCart,
  CartItem,
  TableSession,
  addToCart,
} from '@/lib/store';
import { STATIC_PROMOS } from '@/lib/staticData';
import { IPromo } from '@/lib/models';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableSession, setTableSession] = useState<TableSession>({ tableId: 'table-5', tableNumber: 5 });
  const [notes, setNotes] = useState<string>('');
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [promos, setPromos] = useState<IPromo[]>(STATIC_PROMOS);
  const [addedPromoId, setAddedPromoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setItems(getCartItems());
    setTableSession(getTableSession());
    setNotes(getOrderNotes());

    fetch('/api/promos')
      .then((res) => res.json())
      .then((data) => {
        if (data.promos && data.promos.length > 0) {
          setPromos(data.promos);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddPromo = (promo: IPromo) => {
    const promoMenuItem = {
      _id: `promo_${promo._id}`,
      name: promo.title,
      description: promo.description,
      price: promo.discountedPrice,
      category: 'makanan',
      photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    };

    addToCart(promoMenuItem, 1);
    setAddedPromoId(promo._id || 'promo-1');
    setItems(getCartItems());
  };

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * 0.10); // PB1 10%
  const serviceChargeAmount = Math.round(subtotal * 0.05); // Service 5%
  const combinedTaxService = taxAmount + serviceChargeAmount;
  const grandTotal = subtotal + combinedTaxService;

  const handleCreateOrder = async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const fullNotes = [notes, extraNotes].filter(Boolean).join(' | ');

    try {
      const payload = {
        tableNumber: tableSession.tableNumber,
        items: items.map((ci) => ({
          menuItemId: ci.menuItem._id,
          name: ci.menuItem.name,
          qty: ci.qty,
          price: ci.unitPrice,
          spiceLevel: ci.spiceLevel || '',
          addOns: ci.selectedAddOns,
          lineTotal: ci.lineTotal,
        })),
        notes: fullNotes,
        subtotal,
        taxAmount,
        serviceChargeAmount,
        total: grandTotal,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.order && data.order.orderCode) {
        clearCart();
        router.push(`/order/${encodeURIComponent(data.order.orderCode)}`);
      } else {
        throw new Error('Gagal memproses pesanan');
      }
    } catch (err) {
      alert('Terjadi kendala saat mengirim pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-[#f5c7bc]">
          <p className="text-[#7a2323] font-bold mb-4">Keranjang belanja Anda kosong.</p>
          <Link href="/menu" className="px-6 py-2.5 bg-[#7a2323] text-white rounded-full text-sm">
            Kembali ke Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Page Title matching desktop-checkout screenshot */}
      <h1 className="font-serif italic font-bold text-4xl md:text-5xl text-[#7a2323] mb-8">
        Konfirmasi Pesanan
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Table Info, Promo Card, Extra Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Lokasi Meja Makan Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#fce9e4] text-[#7a2323] flex items-center justify-center shrink-0 border border-[#f5c7bc]">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block">
                Lokasi Meja Makan
              </span>
              <h3 className="font-bold text-lg text-[#2a1a15]">
                Meja Makan {tableSession.tableNumber}
              </h3>
              <p className="text-xs text-[#735a52] font-light mt-0.5">
                Silakan konfirmasi ke pelayan jika ingin berpindah meja
              </p>
            </div>
          </div>

          {/* Upsell Promo Card matching desktop-checkout screenshot */}
          {promos.length > 0 && (
            <div className="bg-[#fce9e4]/80 rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#7a2323] shrink-0" />
                  <h4 className="font-serif italic font-bold text-lg text-[#7a2323]">
                    {promos[0].title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="line-through text-[#9e8d87]">{formatRupiah(promos[0].originalPrice)}</span>
                  <span className="text-[#7a2323] text-base">{formatRupiah(promos[0].discountedPrice)}</span>
                  <button
                    onClick={() => handleAddPromo(promos[0])}
                    className={`ml-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                      addedPromoId === (promos[0]._id || 'promo-1')
                        ? 'bg-[#15803d] text-white'
                        : 'bg-[#7a2323] hover:bg-[#631c1c] text-white'
                    }`}
                  >
                    {addedPromoId === (promos[0]._id || 'promo-1') ? 'Tersimpan' : 'Tambah'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#735a52] leading-relaxed font-light">
                {promos[0].description}
              </p>
            </div>
          )}

          {/* Catatan Tambahan (Opsional) */}
          <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-3">
            <label className="font-bold text-base text-[#2a1a15] block">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Contoh: Jangan terlalu pedas, tambah kerupuk..."
              className="w-full p-4 rounded-2xl border border-[#f5c7bc] bg-[#fdf1ee]/50 text-sm text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none focus:border-[#7a2323] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Column: Ringkasan Pesanan Card matching desktop-checkout screenshot */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f5c7bc] shadow-card space-y-6">
            <h2 className="font-serif italic font-bold text-2xl text-[#7a2323]">
              Ringkasan Pesanan
            </h2>

            {/* Line items summary */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {items.map((ci) => {
                const spiceText = ci.spiceLevel ? ci.spiceLevel : '';
                const addOnsText = ci.selectedAddOns.map((a) => a.label).join(', ');
                const summary = [spiceText, addOnsText].filter(Boolean).join(', ');

                return (
                  <div key={ci.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#fce9e4] shrink-0 border border-[#f5c7bc]">
                        <Image
                          src={ci.menuItem.photoUrl}
                          alt={ci.menuItem.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <div className="font-bold text-[#2a1a15] text-sm">{ci.menuItem.name}</div>
                        <div className="text-[11px] text-[#735a52]">
                          {ci.qty}x {summary ? `- ${summary}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-[#7a2323] text-sm">{formatRupiah(ci.lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <hr className="border-[#f3d9d3]" />

            <div className="space-y-2.5 text-sm text-[#5a423a]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#735a52]">
                <span>Pajak & Layanan (15%)</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(combinedTaxService)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <span className="font-bold text-lg text-[#2a1a15]">Total Keseluruhan</span>
              <span className="font-bold text-2xl text-[#7a2323]">{formatRupiah(grandTotal)}</span>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Mengirim Pesanan...' : 'Buat Pesanan Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
