'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart,
  ShoppingBag,
  ArrowRight,
  Plus,
  Check,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { IMenuItem } from '@/lib/types';
import { STATIC_MENU_ITEMS } from '@/lib/staticData';
import { addToCart, getCartItems, storeEvents } from '@/lib/store';

export default function FavoritPage() {
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [cartItems, setCartItems] = useState(getCartItems());
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('wkb_favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch (_) {}

    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
          const dbNames = new Set(data.menuItems.map((m: any) => m.name.toLowerCase()));
          const missing = STATIC_MENU_ITEMS.filter(
            (s) => !dbNames.has(s.name.toLowerCase()),
          );
          setMenuItems([...data.menuItems, ...missing]);
        }
      })
      .catch(() => {});
  }, []);

  const refreshCart = useCallback(() => setCartItems(getCartItems()), []);
  useEffect(() => {
    refreshCart();
    const unsub = storeEvents.subscribe(refreshCart);
    const handler = () => refreshCart();
    window.addEventListener('wkb:cart-updated', handler);
    return () => {
      unsub();
      window.removeEventListener('wkb:cart-updated', handler);
    };
  }, [refreshCart]);

  const cartCount = cartItems.reduce((s, i) => s + (i.qty || 0), 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((c) => (c === msg ? null : c)), 2800);
  };

  const favoriteItems = useMemo(() => {
    const byId = new Map(menuItems.map((m) => [m.id || m._id || '', m]));
    return Object.entries(favorites)
      .filter(([, v]) => v)
      .map(([id]) => byId.get(id))
      .filter((item): item is IMenuItem => Boolean(item && item.isActive !== false));
  }, [favorites, menuItems]);

  const handleQuickAdd = (item: IMenuItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const defaultSpice =
      item.spiceLevels && item.spiceLevels.length > 0 ? 'Sedang' : undefined;
    const updated = addToCart(item, 1, defaultSpice, []);
    setCartItems([...updated]);
    const id = item.id || item._id || '';
    setJustAddedId(id);
    showToast(`"${item.name}" berhasil ditambahkan ke keranjang!`);
    setTimeout(() => setJustAddedId((c) => (c === id ? null : c)), 900);
  };

  const removeFavorite = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = { ...prev, [itemId]: false };
      try {
        localStorage.setItem('wkb_favorites', JSON.stringify(next));
      } catch (_) {}
      showToast('Dihapus dari favorit');
      return next;
    });
  };

  return (
    <div className="relative min-h-screen py-10 bg-[#f9f3ea] text-[#2a1a15] overflow-x-hidden selection:bg-amber-800 selection:text-white">

      {/* Dekorasi Latar */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.14),transparent_65%)]" />
        <div className="absolute top-[20%] -left-36 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(180,83,9,0.07),transparent_70%)] blur-2xl" />
        <div className="absolute top-[55%] -right-36 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,90,43,0.07),transparent_70%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(#361c12 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
        />
        <div className="absolute top-0 inset-x-0 h-3 flex opacity-15 overflow-hidden">
          <svg className="w-full h-3" preserveAspectRatio="repeat-x" viewBox="0 0 100 12" fill="#361c12">
            <defs>
              <pattern id="gigi-fav" width="20" height="12" patternUnits="userSpaceOnUse">
                <polygon points="0,0 10,12 20,0" />
              </pattern>
            </defs>
            <rect width="100%" height="12" fill="url(#gigi-fav)" />
          </svg>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-24">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d1f14] via-[#2d140c] to-[#1c0c06] p-8 md:p-12 text-[#fbf5eb] shadow-[0_16px_45px_rgba(42,26,21,0.22)] mb-10 border-2 border-[#5d3221]">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amber-600/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 0, transparent 8px)` }} />
          <div className="absolute top-0 inset-x-0 h-2 opacity-15 overflow-hidden pointer-events-none">
            <svg className="w-full h-2" preserveAspectRatio="repeat-x" viewBox="0 0 100 8" fill="#fbf5eb">
              <defs>
                <pattern id="gigi-banner-fav" width="16" height="8" patternUnits="userSpaceOnUse">
                  <polygon points="0,0 8,8 16,0" />
                </pattern>
              </defs>
              <rect width="100%" height="8" fill="url(#gigi-banner-fav)" />
            </svg>
          </div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4e2a1d]/90 backdrop-blur-xs text-xs font-bold tracking-wide uppercase text-rose-300 border border-[#6b3c2a] shadow-xs">
              <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
              <span>Koleksi Pilihan Anda</span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#fbf5eb] leading-tight drop-shadow-sm">
              Menu Favorit Saya
            </h1>
            <p className="text-sm md:text-base text-[#eeddc5] leading-relaxed font-normal max-w-2xl">
              Semua hidangan dan minuman yang Anda tandai dengan ikon hati terkumpul di sini — mudah ditemukan dan langsung bisa dipesan kapan saja.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[#f5ebd8]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221009]/80 border border-[#542d1e] shadow-xs">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                {isMounted ? favoriteItems.length : 0} Menu Tersimpan
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221009]/80 border border-[#542d1e] shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                {isMounted ? cartCount : 0} Item di Keranjang
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#221009]/80 border border-[#542d1e] shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Tersimpan Otomatis
              </span>
            </div>
          </div>

          <div className="absolute -right-4 -bottom-6 opacity-10 pointer-events-none">
            <Heart className="w-72 h-72 text-rose-300 fill-rose-300 drop-shadow-[0_0_35px_rgba(244,63,94,0.3)]" />
          </div>
        </div>

        {/* Konten Utama */}
        {!isMounted ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8c5950]">
            <div className="w-10 h-10 border-4 border-[#b45309] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold">Memuat menu favorit Anda...</p>
          </div>
        ) : favoriteItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
            <div className="w-24 h-24 rounded-full bg-[#ebdcc8] border-2 border-[#cfb28d] flex items-center justify-center shadow-md">
              <Heart className="w-12 h-12 text-[#b45309]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif font-bold text-2xl text-[#2a1a15]">Belum Ada Menu Favorit</h2>
              <p className="text-sm text-[#63483f] max-w-sm leading-relaxed">
                Tekan ikon ❤️ pada produk di halaman menu untuk menyimpannya ke daftar favorit Anda.
              </p>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#361c12] hover:bg-[#b45309] text-[#fbf5eb] text-sm font-semibold transition-all shadow-md hover:shadow-lg border border-[#542d1e]"
            >
              <span>Jelajahi Menu Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Header Daftar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-[#d6be9c] gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#ebdcc8] text-[#361c12] flex items-center justify-center border border-[#cfb28d] shadow-xs">
                  <Heart className="w-5 h-5 fill-[#b45309] text-[#b45309]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#361c12]">Daftar Favorit</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#361c12] text-rose-300 text-[11px] font-bold border border-[#542d1e]">
                      {favoriteItems.length} Item
                    </span>
                  </div>
                  <p className="text-xs text-[#63483f] mt-0.5 font-medium">
                    Klik ikon + untuk langsung memesan, atau ❤️ untuk menghapus dari favorit.
                  </p>
                </div>
              </div>

              <Link
                href="/menu"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#eeddc5] hover:bg-[#b45309] border border-[#cfb28d] hover:border-transparent text-[#361c12] hover:text-white text-xs font-semibold transition-all shadow-xs"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Tambah Favorit Baru</span>
              </Link>
            </div>

            {/* Grid Kartu */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {favoriteItems.map((item) => {
                const itemId = item.id || item._id || '';
                const isAdded = justAddedId === itemId;

                return (
                  <div
                    key={itemId}
                    className="group relative bg-[#fbf5eb] rounded-3xl border-2 border-[#d5be9b] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f5ede7]">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#ebdcc8]">
                          <Coffee className="w-10 h-10 text-[#b45309] opacity-40" />
                        </div>
                      )}

                      {item.badge && (
                        <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#7a2318] text-white shadow-xs">
                          {item.badge === 'best_seller' ? 'BEST SELLER' : item.badge.toUpperCase()}
                        </span>
                      )}

                      <button
                        onClick={(e) => removeFavorite(itemId, e)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-rose-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                        aria-label="Hapus dari favorit"
                        title="Hapus dari favorit"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      </button>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-[#1c1917] leading-tight line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-[11px] text-[#736055] line-clamp-2 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#e2cca9] mt-2">
                        <div>
                          <span className="text-[10px] text-[#8c786a] block leading-none">Harga</span>
                          <span className="font-extrabold text-sm sm:text-base text-[#1c1917]">
                            {formatRupiah(item.price)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleQuickAdd(item, e)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                            isAdded ? 'bg-emerald-600 text-white' : 'bg-[#361c12] hover:bg-[#b45309] text-white'
                          }`}
                          aria-label={`Tambah ${item.name} ke keranjang`}
                          title="Tambah ke Keranjang"
                        >
                          {isAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Kembali */}
            <div className="text-center pt-6">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#361c12] hover:bg-[#b45309] text-[#fbf5eb] text-sm font-semibold transition-all shadow-md hover:shadow-lg border border-[#542d1e]"
              >
                <span>Lihat Semua Menu Makanan &amp; Minuman</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] bg-[#2a150e] text-[#fbf5eb] p-4 rounded-2xl shadow-xl border-2 border-[#b45309] flex items-center gap-3 transition-all">
          <div className="w-9 h-9 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#fbf5eb]">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

