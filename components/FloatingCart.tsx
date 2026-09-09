'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Tag, Utensils } from 'lucide-react';
import {
  getCartItems,
  updateCartQty,
  removeCartItem,
  getTableSession,
  storeEvents,
  CartItem,
} from '@/lib/store';

interface FloatingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FloatingCart({ isOpen, onClose }: FloatingCartProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<number>(5);

  const refreshCart = useCallback(() => {
    setItems(getCartItems());
    setTableNumber(getTableSession().tableNumber);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshCart();
    const unsub = storeEvents.subscribe(refreshCart);
    return () => unsub();
  }, [refreshCart]);

  useEffect(() => {
    if (!isMounted) return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleQtyChange = (id: string, delta: number) => {
    updateCartQty(id, delta);
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      removeCartItem(id);
      setRemovingId(null);
    }, 220);
  };

  const total = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const totalItems = items.reduce((acc, item) => acc + item.qty, 0);

  if (!isMounted) return null;

  return (
    <>
      {/* Overlay — no blur */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang Belanja"
        style={{ boxShadow: '-8px 0 40px rgba(122,35,35,0.13), -2px 0 12px rgba(0,0,0,0.10)' }}
        className={[
          'fixed top-0 right-0 z-50 h-screen',
          'w-[92vw] sm:w-[380px] md:w-[410px] lg:w-[430px]',
          'flex flex-col',
          'bg-white',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >

        {/* ═══ HEADER ═══ */}
        <div className="flex-none relative overflow-hidden bg-gradient-to-br from-[#7a2323] via-[#8b2e2e] to-[#a03535]">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base leading-tight">
                  Keranjang Belanja
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  {totalItems > 0 ? `${totalItems} item dalam keranjang` : 'Belum ada item'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Table badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/20 border border-white/20">
                <Utensils className="w-3 h-3 text-white/80" />
                <span className="text-white text-xs font-semibold leading-none">
                  Meja {tableNumber}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Tutup keranjang"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ PRODUCT LIST ═══ */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 max-h-[50vh] bg-[#fafafa]">

          {items.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center min-h-[320px] px-8 text-center gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fce9e4] to-[#f8d5cc] flex items-center justify-center shadow-inner">
                  <ShoppingCart className="w-10 h-10 text-[#c48c82]" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#fdf1ee] border-2 border-white flex items-center justify-center text-lg">
                  😢
                </div>
              </div>
              <div>
                <p className="text-[#2a1a15] font-bold text-base">
                  Keranjang masih kosong
                </p>
                <p className="text-[#9e6e63] text-sm mt-1 leading-relaxed">
                  Temukan menu lezat kami dan tambahkan ke keranjang!
                </p>
              </div>
              <button
                onClick={() => { onClose(); router.push('/menu'); }}
                className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-[#7a2323] to-[#a03535] text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                Mulai Belanja
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          ) : (
            /* ── Item List ── */
            <ul className="py-2">
              {items.map((item, idx) => {
                const imgSrc = item.menuItem.photoUrl ||
                  `https://placehold.co/72x72/fce9e4/7a2323?text=${encodeURIComponent(item.menuItem.name[0])}`;
                const isRemoving = removingId === item.id;

                return (
                  <li
                    key={item.id}
                    style={{
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? 'translateX(40px)' : 'none',
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                    }}
                    className="mx-3 mb-2 bg-white rounded-2xl border border-[#f0e6e3] overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3">
                      {/* Foto */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div className="relative flex-none">
                        <img
                          src={imgSrc}
                          alt={item.menuItem.name}
                          className="w-[72px] h-[72px] rounded-xl object-cover bg-[#fce9e4]"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://placehold.co/72x72/fce9e4/7a2323?text=${encodeURIComponent(item.menuItem.name[0])}`;
                          }}
                        />
                        {/* Qty badge on image */}
                        <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#7a2323] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                          {item.qty}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#2a1a15] font-semibold text-sm leading-snug line-clamp-1">
                          {item.menuItem.name}
                        </p>

                        {/* Tags: spice + addons */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.spiceLevel && item.spiceLevel !== 'none' && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#fce9e4] text-[#7a2323] px-1.5 py-0.5 rounded-full font-medium">
                              🌶 {item.spiceLevel}
                            </span>
                          )}
                          {item.selectedAddOns?.slice(0, 2).map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-[#f0f0f0] text-[#666] px-1.5 py-0.5 rounded-full font-medium">
                              <Tag className="w-2.5 h-2.5" />
                              {a.label}
                            </span>
                          ))}
                          {(item.selectedAddOns?.length ?? 0) > 2 && (
                            <span className="text-[10px] text-[#9e6e63]">
                              +{(item.selectedAddOns?.length ?? 0) - 2} lagi
                            </span>
                          )}
                        </div>

                        {/* Price row */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#7a2323] font-bold text-sm">
                            {formatRupiah(item.lineTotal)}
                          </span>
                          <span className="text-[#b0907a] text-xs">
                            @{formatRupiah(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#fafafa] border-t border-[#f0e6e3]">
                      {/* Delete */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Hapus ${item.menuItem.name}`}
                        className="flex items-center gap-1 text-xs text-[#b54141] hover:text-[#7a2323] transition-colors py-1 px-2 rounded-lg hover:bg-[#fce9e4]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 bg-white border border-[#e8d5d0] rounded-full px-1.5 py-1">
                        <button
                          onClick={() => handleQtyChange(item.id, -1)}
                          aria-label={`Kurangi ${item.menuItem.name}`}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#fdf1ee] hover:bg-[#f8dbd4] transition-colors text-[#7a2323] font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-bold text-[#2a1a15] tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.id, 1)}
                          aria-label={`Tambah ${item.menuItem.name}`}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#7a2323] hover:bg-[#5e1a1a] transition-colors text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {/* Bottom padding */}
              <li className="h-2" aria-hidden="true" />
            </ul>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        {items.length > 0 && (
          <div className="flex-none bg-white border-t border-[#f0e6e3]">
            {/* Summary rows */}
            <div className="px-5 pt-4 pb-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b4c43]">
                  Subtotal ({totalItems} item)
                </span>
                <span className="font-semibold text-[#2a1a15]">
                  {formatRupiah(total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#9e6e63]">
                <span>Pajak & biaya layanan</span>
                <span>Dihitung saat checkout</span>
              </div>
            </div>

            {/* Divider with dashes */}
            <div className="mx-5 my-2 border-t border-dashed border-[#e8d5d0]" />

            {/* Grand total */}
            <div className="flex items-center justify-between px-5 mb-4">
              <span className="font-bold text-[#2a1a15]">Total Belanja</span>
              <span className="text-xl font-extrabold text-[#7a2323]">
                {formatRupiah(total)}
              </span>
            </div>

            {/* CTA */}
            <div className="px-4 pb-5">
              <button
                onClick={() => { onClose(); router.push('/checkout'); }}
                className="w-full relative overflow-hidden py-3.5 bg-gradient-to-r from-[#7a2323] to-[#a03535] text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Lanjut Checkout</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-[#7a2323] text-sm font-medium hover:text-[#5e1a1a] transition-colors"
              >
                Lanjutkan Belanja
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
