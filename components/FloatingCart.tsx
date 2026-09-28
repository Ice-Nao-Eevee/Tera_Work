'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Tag, Utensils, ClipboardList, Clock, ChevronLeft, ExternalLink } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import {
  getCartItems,
  updateCartQty,
  removeCartItem,
  getManualTableNumber,
  getOrderHistory,
  OrderHistoryEntry,
  storeEvents,
  CartItem,
} from '@/lib/store';

interface FloatingCartProps {
  isOpen: boolean;
  onClose: () => void;
}


export default function FloatingCart({ isOpen, onClose }: FloatingCartProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { status: string; items: { name: string; qty: number }[] }>>({});

  const refreshCart = useCallback(() => {
    setItems(getCartItems());
    setTableNumber(getManualTableNumber());
    setOrderHistory(getOrderHistory());
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshCart();
    const unsub = storeEvents.subscribe(refreshCart);
    return () => unsub();
  }, [refreshCart]);

  // Fetch order statuses when history panel is opened
  useEffect(() => {
    if (!showHistory || orderHistory.length === 0) return;
    const fetchStatuses = async () => {
      for (const entry of orderHistory) {
        if (orderStatuses[entry.orderCode]) continue; // already fetched
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(entry.orderCode)}`);
          const data = await res.json();
          if (data.order) {
            setOrderStatuses(prev => ({
              ...prev,
              [entry.orderCode]: {
                status: data.order.status,
                items: data.order.items?.map((i: { name: string; qty: number }) => ({ name: i.name, qty: i.qty })) || [],
              },
            }));
          }
        } catch {
          // Ignore errors for individual orders
        }
      }
    };
    fetchStatuses();
  }, [showHistory, orderHistory]);

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

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'selesai') return { label: 'Selesai', cls: 'bg-[#dcfce7] text-[#15803d] border-[#86efac]' };
    if (s === 'ready' || s === 'siap') return { label: 'Siap Disajikan', cls: 'bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]' };
    if (s === 'preparing') return { label: 'Disiapkan', cls: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]' };
    if (s === 'received') return { label: 'Diterima', cls: 'bg-[#f3e8d6] text-[#b45309] border-[#d4bc8c]' };
    return { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const formatDateShort = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch { return '—'; }
  };

  if (!isMounted) return null;

  return (
    <>
      {/* Sidebar (No dark overlay so left menu remains 100% visible & scrollable) */}
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Keranjang Belanja"
        style={{ boxShadow: '-12px 0 40px rgba(0,0,0,0.15), -4px 0 16px rgba(0,0,0,0.08)' }}
        className={[
          'fixed top-0 right-0 z-50 h-screen',
          'w-[92vw] sm:w-[380px] md:w-[410px] lg:w-[430px]',
          'flex flex-col',
          'bg-white border-l border-[#ece8e3]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none',
        ].join(' ')}
      >

        {/* ═══ HEADER ═══ */}
        <div className="flex-none relative overflow-hidden bg-gradient-to-br from-[#b45309] via-[#8b2e2e] to-[#a03535]">
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
                  {showHistory ? 'Riwayat Pesanan' : 'Keranjang Belanja'}
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  {showHistory
                    ? `${orderHistory.length} pesanan tercatat`
                    : (totalItems > 0 ? `${totalItems} item dalam keranjang` : 'Belum ada item')
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* List Pesanan button — always visible */}
              <button
                onClick={() => setShowHistory(h => !h)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${
                  showHistory
                    ? 'bg-white/30 border-white/30 text-white'
                    : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/20'
                }`}
                title={showHistory ? 'Kembali ke Keranjang' : 'List Pesanan'}
              >
                {showHistory ? (
                  <><ChevronLeft className="w-3 h-3" /><span className="text-xs font-semibold">Keranjang</span></>
                ) : (
                  <><ClipboardList className="w-3 h-3" /><span className="text-xs font-semibold">Pesanan</span>{orderHistory.length > 0 && <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">{orderHistory.length}</span>}</>
                )}
              </button>
              {/* Table badge — shows neutral state until table is entered at checkout */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                tableNumber > 0 ? 'bg-white/20 border-white/20' : 'bg-white/10 border-white/10 opacity-70'
              }`}>
                <Utensils className="w-3 h-3 text-white/80" />
                <span className="text-white text-xs font-semibold leading-none">
                  {tableNumber > 0 ? `Meja ${tableNumber}` : 'Pilih Meja'}
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

        {/* ═══ PRODUCT LIST / ORDER HISTORY ═══ */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-[#fafafa]">

          {showHistory ? (
            /* ── Order History View ── */
            orderHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[320px] px-8 text-center gap-5">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f3e8d6] to-[#f8d5cc] flex items-center justify-center shadow-inner">
                  <ClipboardList className="w-10 h-10 text-[#c48c82]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[#2a1a15] font-bold text-base">Belum ada pesanan</p>
                  <p className="text-[#9e6e63] text-sm mt-1 leading-relaxed">
                    Riwayat pesanan akan muncul setelah Anda memesan melalui checkout.
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-[#b45309] to-[#a03535] text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Mulai Belanja
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-3 px-3 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-sm text-[#2a1a15]">Riwayat Pesanan</h3>
                  <span className="text-[10px] text-[#827a73] font-medium">{orderHistory.length} pesanan</span>
                </div>
                {orderHistory.map((entry) => {
                  const orderData = orderStatuses[entry.orderCode];
                  const status = orderData?.status || 'received';
                  const badge = statusBadge(status);
                  const orderItems = orderData?.items || [];

                  return (
                    <button
                      key={entry.orderCode}
                      onClick={() => {
                        onClose();
                        router.push(`/order/${encodeURIComponent(entry.orderCode)}`);
                      }}
                      className="w-full text-left bg-white rounded-2xl border border-[#f0e6e3] p-3.5 hover:border-[#d4bc8c] hover:shadow-sm transition-all group"
                    >
                      {/* Top row: code + status */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-xs text-[#b45309]">{entry.orderCode}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Item preview */}
                      {orderItems.length > 0 ? (
                        <p className="text-[11px] text-[#6b4c43] line-clamp-1 mb-2">
                          {orderItems.map(i => `${i.name} x${i.qty}`).join(', ')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#9e8d87] mb-2">{entry.itemCount} item</p>
                      )}

                      {/* Bottom row: table + total + date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-[#827a73]">
                          <span className="flex items-center gap-0.5"><Utensils className="w-2.5 h-2.5" />Meja {entry.tableNumber}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDateShort(entry.createdAt)}</span>
                        </div>
                        <span className="font-bold text-xs text-[#2a1a15]">{formatRupiah(entry.total)}</span>
                      </div>

                      {/* Hover hint */}
                      <div className="flex items-center justify-end mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[#b45309] font-medium flex items-center gap-0.5">
                          Lihat detail <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : items.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center min-h-[320px] px-8 text-center gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f3e8d6] to-[#f8d5cc] flex items-center justify-center shadow-inner">
                  <ShoppingCart className="w-10 h-10 text-[#c48c82]" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#fcf8f2] border-2 border-white flex items-center justify-center text-lg">
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
                className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-[#b45309] to-[#a03535] text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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
                          className="w-[72px] h-[72px] rounded-xl object-cover bg-[#f3e8d6]"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              `https://placehold.co/72x72/fce9e4/7a2323?text=${encodeURIComponent(item.menuItem.name[0])}`;
                          }}
                        />
                        {/* Qty badge on image */}
                        <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#b45309] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
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
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#f3e8d6] text-[#b45309] px-1.5 py-0.5 rounded-full font-medium">
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
                          <span className="text-[#b45309] font-bold text-sm">
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
                        className="flex items-center gap-1 text-xs text-[#b54141] hover:text-[#b45309] transition-colors py-1 px-2 rounded-lg hover:bg-[#f3e8d6]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 bg-white border border-[#e8d5d0] rounded-full px-1.5 py-1">
                        <button
                          onClick={() => handleQtyChange(item.id, -1)}
                          aria-label={`Kurangi ${item.menuItem.name}`}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#fcf8f2] hover:bg-[#ebdbb7] transition-colors text-[#b45309] font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-bold text-[#2a1a15] tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.id, 1)}
                          aria-label={`Tambah ${item.menuItem.name}`}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#b45309] hover:bg-[#5e1a1a] transition-colors text-white"
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

        {/* ═══ FOOTER (hidden when history is shown) ═══ */}
        {items.length > 0 && !showHistory && (
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
              <span className="text-xl font-extrabold text-[#b45309]">
                {formatRupiah(total)}
              </span>
            </div>

            {/* CTA */}
            <div className="px-4 pb-5">
              <button
                onClick={() => { onClose(); router.push('/checkout'); }}
                className="w-full relative overflow-hidden py-3.5 bg-gradient-to-r from-[#b45309] to-[#a03535] text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Lanjut Checkout</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-[#b45309] text-sm font-medium hover:text-[#5e1a1a] transition-colors"
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
