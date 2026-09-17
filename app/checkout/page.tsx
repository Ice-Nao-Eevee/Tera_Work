'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Utensils, Tag, ArrowRight, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import {
  getCartItems,
  getManualTableNumber,
  saveManualTableNumber,
  getOrderNotes,
  clearCart,
  addToCart,
  storeEvents,
  CartItem,
} from '@/lib/store';
import { STATIC_PROMOS } from '@/lib/staticData';
import { IPromo } from '@/lib/types';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [manualTableNumber, setManualTableNumber] = useState<number>(0);
  const [tableError, setTableError] = useState<string>('');
  const [tableAdvisory, setTableAdvisory] = useState<string>('');
  const [knownTableNumbers, setKnownTableNumbers] = useState<number[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [promos, setPromos] = useState<IPromo[]>(STATIC_PROMOS);
  const [addedPromoId, setAddedPromoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0.10);
  const [serviceRate, setServiceRate] = useState<number>(0.05);

  const refreshCart = useCallback(() => {
    setItems(getCartItems());
  }, []);

  useEffect(() => {
    refreshCart();
    setManualTableNumber(getManualTableNumber());
    setNotes(getOrderNotes());

    // Fetch promos, settings, and known tables in parallel
    Promise.all([
      fetch('/api/promos').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/tables').then(r => r.json()).catch(() => ({})),
    ]).then(([promoData, settingsData, tablesData]) => {
      if (promoData.promos?.length > 0) setPromos(promoData.promos);
      if (settingsData.settings) {
        setTaxRate((settingsData.settings.taxRatePercent ?? 10) / 100);
        setServiceRate((settingsData.settings.serviceChargeRatePercent ?? 5) / 100);
      }
      if (tablesData.tables) {
        setKnownTableNumbers(tablesData.tables.map((t: any) => t.tableNumber));
      }
    });

    const unsubscribe = storeEvents.subscribe(refreshCart);
    return () => unsubscribe();
  }, [refreshCart]);

  const handleTableNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const val = raw === '' ? 0 : parseInt(raw, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    setManualTableNumber(num);
    saveManualTableNumber(num);
    if (tableError) setTableError('');
    // Soft advisory — warn but never block
    if (num > 0 && knownTableNumbers.length > 0 && !knownTableNumbers.includes(num)) {
      setTableAdvisory(`Meja ${num} tidak ditemukan dalam daftar terdaftar. Pastikan nomor meja Anda sudah benar.`);
    } else {
      setTableAdvisory('');
    }
  };

  const handleAddPromo = (promo: IPromo) => {
    const promoId = promo.id || promo._id || 'promo-1';
    const promoMenuItem = {
      id: `promo_${promoId}`,
      _id: `promo_${promoId}`,
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
    setAddedPromoId(promoId);
  };

  // Preview totals (for display only — server will recalculate authoritatively)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const serviceChargeAmount = Math.round(subtotal * serviceRate);
  const combinedTaxService = taxAmount + serviceChargeAmount;
  const grandTotal = subtotal + combinedTaxService;

  const handleCreateOrder = async () => {
    if (items.length === 0 || isSubmitting) return;

    // Client-side validation: table number required
    if (!manualTableNumber || manualTableNumber < 1) {
      setTableError('Harap masukkan nomor meja Anda sebelum melanjutkan.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const fullNotes = [notes, extraNotes].filter(Boolean).join(' | ');

    try {
      const payload = {
        tableNumber: manualTableNumber,
        items: items.map((ci) => ({
          menuItemId: ci.menuItem.id || (ci.menuItem as any)._id,
          name: ci.menuItem.name,
          qty: ci.qty,
          price: ci.unitPrice,
          spiceLevel: ci.spiceLevel || '',
          addOns: ci.selectedAddOns,
          lineTotal: ci.lineTotal,
        })),
        notes: fullNotes,
        // NOTE: subtotal/tax/total below are hints only — server ignores and recalculates
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

      if (!res.ok) {
        setSubmitError(data.error || 'Terjadi kendala saat mengirim pesanan.');
        setIsSubmitting(false);
        return;
      }

      if (data.order?.orderCode) {
        clearCart(); // also clears MANUAL_TABLE_KEY
        router.push(`/order/${encodeURIComponent(data.order.orderCode)}`);
      } else {
        throw new Error('Respons server tidak valid');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Terjadi kendala saat mengirim pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-[#d4bc8c]">
          <p className="text-[#b45309] font-bold mb-4">Keranjang belanja Anda kosong.</p>
          <Link href="/menu" className="px-6 py-2.5 bg-[#b45309] text-white rounded-full text-sm">
            Kembali ke Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      <h1 className="font-serif italic font-bold text-4xl md:text-5xl text-[#b45309] mb-8">
        Konfirmasi Pesanan
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">

          {/* ── Nomor Meja Input Card ── */}
          <div className="bg-white rounded-3xl p-6 border border-[#d4bc8c] shadow-card space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f3e8d6] text-[#b45309] flex items-center justify-center shrink-0 border border-[#d4bc8c]">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block">
                  Nomor Meja <span className="text-[#b45309]">*</span>
                </span>
                <p className="text-xs text-[#735a52] font-light mt-0.5">
                  Lihat nomor yang tertera di meja Anda, lalu ketik di bawah ini
                </p>
              </div>
            </div>
            <div>
              <input
                id="table-number-input"
                type="number"
                min="1"
                max="99"
                value={manualTableNumber > 0 ? manualTableNumber : ''}
                onChange={handleTableNumberChange}
                placeholder="Contoh: 5"
                className={`w-full p-4 rounded-2xl border text-base font-bold text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none transition-all ${
                  tableError
                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                    : 'border-[#d4bc8c] bg-[#fcf8f2]/50 focus:border-[#b45309] focus:bg-white'
                }`}
              />
              {tableError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {tableError}
                </p>
              )}
              {!tableError && tableAdvisory && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ {tableAdvisory}
                </p>
              )}
            </div>
          </div>

          {/* ── Upsell Promo Card ── */}
          {promos.length > 0 && (
            <div className="bg-[#f3e8d6]/80 rounded-3xl p-6 border border-[#d4bc8c] shadow-card space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#b45309] shrink-0" />
                  <h4 className="font-serif italic font-bold text-lg text-[#b45309]">
                    {promos[0].title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="line-through text-[#9e8d87]">{formatRupiah(promos[0].originalPrice)}</span>
                  <span className="text-[#b45309] text-base">{formatRupiah(promos[0].discountedPrice)}</span>
                  <button
                    onClick={() => handleAddPromo(promos[0])}
                    className={`ml-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                      addedPromoId === (promos[0].id || promos[0]._id || 'promo-1')
                        ? 'bg-[#15803d] text-white'
                        : 'bg-[#b45309] hover:bg-[#631c1c] text-white'
                    }`}
                  >
                    {addedPromoId === (promos[0].id || promos[0]._id || 'promo-1') ? 'Tersimpan' : 'Tambah'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#735a52] leading-relaxed font-light">
                {promos[0].description}
              </p>
            </div>
          )}

          {/* ── Catatan Tambahan ── */}
          <div className="bg-white rounded-3xl p-6 border border-[#d4bc8c] shadow-card space-y-3">
            <label className="font-bold text-base text-[#2a1a15] block">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Contoh: Jangan terlalu pedas, tambah kerupuk..."
              className="w-full p-4 rounded-2xl border border-[#d4bc8c] bg-[#fcf8f2]/50 text-sm text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none focus:border-[#b45309] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Column: Ringkasan Pesanan */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#d4bc8c] shadow-card space-y-6">
            <h2 className="font-serif italic font-bold text-2xl text-[#b45309]">
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
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#f3e8d6] shrink-0 border border-[#d4bc8c]">
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
                    <span className="font-bold text-[#b45309] text-sm">{formatRupiah(ci.lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <hr className="border-[#e6cdac]" />

            <div className="space-y-2.5 text-sm text-[#5a423a]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#735a52]">
                <span>Pajak ({Math.round(taxRate * 100)}%) + Layanan ({Math.round(serviceRate * 100)}%)</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(combinedTaxService)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <span className="font-bold text-lg text-[#2a1a15]">Total Keseluruhan</span>
              <span className="font-bold text-2xl text-[#b45309]">{formatRupiah(grandTotal)}</span>
            </div>

            {/* Inline submit error */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              onClick={handleCreateOrder}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#b45309] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
