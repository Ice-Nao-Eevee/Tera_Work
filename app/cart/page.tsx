'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import {
  getCartItems,
  updateCartQty,
  removeCartItem,
  getOrderNotes,
  saveOrderNotes,
  storeEvents,
  CartItem,
} from '@/lib/store';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0.10);
  const [serviceRate, setServiceRate] = useState<number>(0.05);

  // Load tax/service rates from DB settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.settings) {
          setTaxRate((data.settings.taxRatePercent ?? 10) / 100);
          setServiceRate((data.settings.serviceChargeRatePercent ?? 5) / 100);
        }
      })
      .catch(() => {}); // keep defaults on error
  }, []);

  const refreshCart = () => {
    setItems(getCartItems());
    setNotes(getOrderNotes());
  };

  useEffect(() => {
    refreshCart();
    const unsubscribe = storeEvents.subscribe(refreshCart);
    return () => unsubscribe();
  }, []);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    saveOrderNotes(val);
  };

  // Tax rates from DB settings (falls back to 10%/5% if settings not loaded yet)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const serviceChargeAmount = Math.round(subtotal * serviceRate);
  const combinedTaxService = taxAmount + serviceChargeAmount;
  const grandTotal = subtotal + combinedTaxService;

  if (items.length === 0) {
    return (
      <main className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-[#7a2323] flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 stroke-[1.8]" />
        </div>
        <h1 className="font-serif italic font-bold text-3xl text-[#7a2323] mb-2">
          Keranjang Kosong
        </h1>
        <p className="text-sm text-[#735a52] mb-8 leading-relaxed">
          Belum ada hidangan yang Anda pilih. Yuk lihat menu kami dan pilih hidangan favoritmu!
        </p>
        <Link
          href="/menu"
          className="px-8 py-3.5 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-sm rounded-full shadow-md transition-colors"
        >
          Lihat Menu Utama
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Page Title matching desktop-cart screenshot */}
      <h1 className="font-serif italic font-bold text-4xl md:text-5xl text-[#7a2323] mb-8">
        Keranjang Belanja
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Items List & Order Notes */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-4">
            {items.map((ci) => {
              const spiceText = ci.spiceLevel ? ci.spiceLevel : '';
              const addOnsText = ci.selectedAddOns.map((a) => a.label).join(', ');
              const optionsSummary = [spiceText, addOnsText].filter(Boolean).join(', ');

              return (
                <div
                  key={ci.id}
                  className="bg-white rounded-3xl p-5 border border-[#f5c7bc] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Item Thumbnail */}
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#fce9e4] shrink-0 border border-[#f5c7bc]">
                      <Image
                        src={ci.menuItem.photoUrl}
                        alt={ci.menuItem.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#2a1a15]">
                        {ci.menuItem.name}
                      </h3>
                      {optionsSummary && (
                        <p className="text-xs text-[#735a52] mt-0.5 font-light">
                          {optionsSummary}
                        </p>
                      )}
                      <div className="font-bold text-sm text-[#7a2323] mt-1 sm:hidden">
                        {formatRupiah(ci.lineTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#fce9e4]">
                    {/* Stepper */}
                    <div className="flex items-center bg-[#fce9e4] border border-[#f5c7bc] rounded-full p-1">
                      <button
                        onClick={() => updateCartQty(ci.id, -1)}
                        className="w-7 h-7 rounded-full bg-white text-[#7a2323] flex items-center justify-center hover:bg-[#f8dbd4] transition-colors"
                        aria-label="Kurangi"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="w-8 text-center font-bold text-[#7a2323] text-sm">
                        {ci.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(ci.id, 1)}
                        className="w-7 h-7 rounded-full bg-[#7a2323] text-white flex items-center justify-center hover:bg-[#631c1c] transition-colors"
                        aria-label="Tambah"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Price Desktop */}
                    <div className="hidden sm:block font-bold text-base text-[#7a2323] min-w-[100px] text-right">
                      {formatRupiah(ci.lineTotal)}
                    </div>

                    {/* Remove Link */}
                    <button
                      onClick={() => removeCartItem(ci.id)}
                      className="text-xs font-semibold text-[#8c5950] hover:text-[#7a2323] hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catatan Pesanan Textarea */}
          <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-3">
            <label className="font-bold text-base text-[#2a1a15] block">
              Catatan Pesanan
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={handleNotesChange}
              placeholder="Contoh: Tidak pakai bawang merah, cabai dipisah..."
              className="w-full p-4 rounded-2xl border border-[#f5c7bc] bg-[#fdf1ee]/50 text-sm text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none focus:border-[#7a2323] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Column: Rincian Pembayaran Card matching desktop-cart screenshot */}
        <div className="lg:col-span-4 sticky top-24">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f5c7bc] shadow-card space-y-6">
            <h2 className="font-serif italic font-bold text-2xl text-[#7a2323]">
              Rincian Pembayaran
            </h2>

            <div className="space-y-3 text-sm text-[#5a423a]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#735a52]">
                <span>Pajak ({Math.round(taxRate * 100)}%) + Service ({Math.round(serviceRate * 100)}%)</span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(combinedTaxService)}</span>
              </div>
            </div>

            <hr className="border-[#f3d9d3]" />

            <div className="flex justify-between items-baseline">
              <span className="font-bold text-lg text-[#2a1a15]">Total</span>
              <span className="font-bold text-2xl text-[#7a2323]">{formatRupiah(grandTotal)}</span>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="w-full py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Lanjutkan Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
