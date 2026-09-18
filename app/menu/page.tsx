'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { getCartItems, addToCart, storeEvents, searchEvents, CartItem } from '@/lib/store';
import { STATIC_MENU_ITEMS, STATIC_CATEGORIES } from '@/lib/staticData';
import { IMenuItem, ICategory } from '@/lib/types';

export default function MenuPage() {
  const [categories, setCategories] = useState<ICategory[]>(STATIC_CATEGORIES);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Derived cart values — recalculated only when cartItems changes
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + (item.qty || 0), 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0), [cartItems]);

  // Load menu items from API or fallback to static data
  useEffect(() => {
    setIsMounted(true);
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
          setMenuItems(data.menuItems);
        }
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => console.log('Using default menu items'));
  }, []);

  // Synchronize local cart state & top search query
  const refreshCart = useCallback(() => {
    setCartItems(getCartItems());
  }, []);

  useEffect(() => {
    refreshCart();
    const unsubscribeCart = storeEvents.subscribe(refreshCart);
    const unsubscribeSearch = searchEvents.subscribe((q) => setSearchQuery(q));
    return () => {
      unsubscribeCart();
      unsubscribeSearch();
    };
  }, [refreshCart]);

  // Filter menu items
  const filteredItems = (menuItems || []).filter((item) => {
    if (!item) return false;
    const cat = String(item.category || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    const sel = String(selectedCategory || 'semua').toLowerCase();
    const q = String(searchQuery || '').toLowerCase();

    const matchesCategory = sel === 'semua' || cat === sel;
    const matchesSearch = name.includes(q) || desc.includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleQuickAdd = (item: IMenuItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultSpice = item.spiceLevels && item.spiceLevels.length > 0 ? 'Sedang' : undefined;
    addToCart(item, 1, defaultSpice, []);
  };

  // Category icon mapping
  const categoryIcons: Record<string, { emoji: string; label: string }> = {
    semua:   { emoji: '🍽️', label: 'Semua' },
    makanan: { emoji: '🍛', label: 'Makanan' },
    minuman: { emoji: '🥤', label: 'Minuman' },
    cemilan: { emoji: '🍟', label: 'Cemilan' },
    dessert: { emoji: '🍮', label: 'Dessert' },
  };

  return (
    <main className="min-h-screen pb-32 bg-[#faf7f2]">

      {/* ─── HERO / SLOGAN BANNER ─── */}
      <section className="bg-[#faf7f2]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="relative rounded-2xl overflow-hidden bg-[#2a1a15] flex items-center min-h-[240px] md:min-h-[280px] my-5 shadow-md">

            {/* Background Image filling the entire box */}
            <div className="absolute inset-0 z-0">
              <img
                src="/menu-teh.jpg"
                alt="Rasa Segar Racikan Istimewa"
                className="w-full h-full object-cover object-center"
              />
              {/* Warm gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#fdf6f0] via-[#fdf6f0]/90 md:via-[#fdf6f0]/75 to-transparent" />
            </div>

            {/* Left: Text Content */}
            <div className="relative z-10 flex flex-col justify-center px-8 py-8 md:px-12 max-w-xl">
              {/* LIMITED TIME badge */}
              <span className="inline-flex items-center self-start px-3 py-1 mb-3 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-[11px] font-semibold text-[#b45309] uppercase tracking-wider shadow-xs">
                Limited Time
              </span>

              {/* Main headline */}
              <h1 className="font-serif font-extrabold text-3xl md:text-4xl text-[#1a1207] leading-tight mb-2">
                Rasa Segar.{' '}
                <span className="text-[#b45309]">Racikan Istimewa.</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-sm md:text-base text-[#5a4638] font-medium max-w-md mb-6 leading-relaxed">
                Bumbu asli Nusantara, diolah segar setiap hari dengan cinta.
              </p>

              {/* CTA */}
              <Link
                href="#menu-grid"
                className="inline-flex items-center gap-2 self-start px-6 py-3 bg-[#b45309] hover:bg-[#631c1c] text-white font-semibold text-sm rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <span>Pesan Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ─── CIRCULAR CATEGORIES (Filter Bar) ─── */}
      <section className="px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-5 sm:gap-8 md:gap-10 overflow-x-auto scrollbar-none py-1">
          {(categories || []).map((cat) => {
            const isActive = selectedCategory === cat.slug;
            const icon = categoryIcons[cat.slug] ?? { emoji: '🍴', label: cat.name };
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group transition-transform active:scale-95"
              >
                {/* Circle */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden border-2 md:border-3 transition-all duration-300 ${
                    isActive
                      ? 'border-[#b45309] ring-4 ring-[#b45309]/20 bg-[#f3e8d6] shadow-md scale-105'
                      : 'border-[#e0d5cf] bg-[#f5ede7] group-hover:border-[#b45309]/50 group-hover:bg-[#f3e8d6]/60 group-hover:shadow-sm'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl select-none transition-transform group-hover:scale-110 duration-200">
                    {icon.emoji}
                  </span>
                </div>

                {/* Label */}
                <span
                  className={`text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                    isActive ? 'text-[#b45309]' : 'text-[#5a423a] group-hover:text-[#b45309]'
                  }`}
                >
                  {icon.label}
                </span>

                {/* Active indicator dot */}
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-[#b45309] scale-100' : 'bg-transparent scale-0'}`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── MENU GRID (5 Columns per row on desktop, flowing downwards) ─── */}
      <div id="menu-grid" className="max-w-7xl mx-auto px-6 md:px-10 pt-4">
        <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#2a1a15] mb-6">
          Daftar Menu
        </h2>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#d4bc8c]">
            <p className="text-[#8c5950] font-medium">Hidangan tidak ditemukan.</p>
            <button
              onClick={() => {
                setSelectedCategory('semua');
                setSearchQuery('');
              }}
              className="mt-4 text-xs font-semibold text-[#b45309] underline"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id || item._id}
                className="bg-white rounded-2xl border border-[#ece8e3] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col h-full group"
              >
                {/* Menu Image */}
                <Link href={`/menu/${item.id || item._id}`} className="block relative h-40 sm:h-44 w-full bg-[#f5ede7] overflow-hidden">
                  <Image
                    src={item.photoUrl || 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'}
                    alt={item.name || 'Menu'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </Link>

                {/* Menu Details: Name on top, Price below */}
                <div className="px-3.5 py-4 flex flex-col items-center flex-grow">
                  <Link href={`/menu/${item.id || item._id}`} className="text-center w-full">
                    <h3 className="font-bold text-sm text-[#8c5b3f] uppercase mb-1.5 line-clamp-2 hover:text-[#b45309] transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                  <span className="font-bold text-[#8c5b3f] text-sm mb-4">
                    {formatRupiah(item.price || 0)}
                  </span>

                  {/* Bottom Action: Arrow to quick add */}
                  <div className="w-full flex items-center justify-end mt-auto pt-1">
                    <button
                      onClick={(e) => handleQuickAdd(item, e)}
                      className="p-1 rounded-full hover:bg-[#f3e8d6] text-[#1a1207] hover:text-[#b45309] transition-colors"
                      title="Tambah ke Keranjang"
                      aria-label={`Tambah ${item.name} ke keranjang`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MOBILE BOTTOM CART BAR ─── */}
      {isMounted && cartCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <div className="bg-[#b45309] text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/20">
            <div>
              <div className="text-[11px] text-[#d4bc8c] uppercase font-semibold">Keranjangmu</div>
              <div className="font-serif font-bold text-lg">{cartCount} Items • {formatRupiah(cartTotal)}</div>
            </div>
            <Link
              href="/cart"
              className="px-5 py-2.5 bg-white text-[#b45309] font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5"
            >
              <span>Lihat</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
