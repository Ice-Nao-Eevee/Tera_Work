'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ShoppingCart, Check } from 'lucide-react';
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
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

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

    const itemId = item.id || item._id || '';
    setJustAddedId(itemId);
    setTimeout(() => {
      setJustAddedId((curr) => (curr === itemId ? null : curr));
    }, 900);
  };

  const getBadgeInfo = (badge?: string) => {
    if (!badge || badge === 'none' || badge.trim() === '') return null;
    const b = badge.toLowerCase().trim();
    if (b === 'best_seller' || b === 'bestseller' || b === 'best seller') {
      return { label: 'Best Seller', className: 'bg-[#7a2318] text-white' };
    }
    if (b === 'chefs_choice' || b === "chef's choice" || b === 'favorit') {
      return { label: "Chef's Choice", className: 'bg-[#d97706] text-white' };
    }
    if (b === 'vegan_friendly' || b === 'vegan') {
      return { label: 'Vegan Friendly', className: 'bg-[#15803d] text-white' };
    }
    return { label: badge, className: 'bg-[#7a2318] text-white' };
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
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
            {filteredItems.map((item) => {
              const badgeInfo = getBadgeInfo(item.badge);
              const isAdded = justAddedId === (item.id || item._id);

              return (
                <div
                  key={item.id || item._id}
                  className="bg-white rounded-[24px] p-3.5 border border-[#ece6df]/80 shadow-[0_4px_20px_rgba(42,26,21,0.04)] hover:shadow-[0_12px_32px_rgba(42,26,21,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
                >
                  {/* Menu Image Container */}
                  <Link
                    href={`/menu/${item.id || item._id}`}
                    className="block relative w-full aspect-[4/3] rounded-[18px] overflow-hidden bg-[#f5ede7]"
                  >
                    <Image
                      src={item.photoUrl || 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'}
                      alt={item.name || 'Menu'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    {badgeInfo && (
                      <span className={`absolute top-2.5 left-2.5 z-10 px-3 py-1 rounded-full text-xs font-semibold shadow-xs ${badgeInfo.className}`}>
                        {badgeInfo.label}
                      </span>
                    )}
                  </Link>

                  {/* Content Container */}
                  <div className="pt-3.5 px-0.5 pb-0.5 flex flex-col flex-grow">
                    <Link
                      href={`/menu/${item.id || item._id}`}
                      className="group-hover:text-[#b45309] transition-colors"
                    >
                      <h3 className="font-bold text-[17px] text-[#1c1917] leading-snug line-clamp-1 mb-1.5">
                        {item.name}
                      </h3>
                    </Link>

                    {item.description && (
                      <p className="text-[13px] text-[#6b6560] leading-relaxed line-clamp-2 mb-4 min-h-[38px]">
                        {item.description}
                      </p>
                    )}

                    {/* Bottom Row: Price on left, Circular Cart Button on right */}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="font-bold text-lg text-[#733e24]">
                        {formatRupiah(item.price || 0)}
                      </span>

                      <button
                        onClick={(e) => handleQuickAdd(item, e)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs flex-shrink-0 active:scale-95 ${
                          isAdded
                            ? 'bg-green-100 text-green-700'
                            : 'bg-[#feece7] hover:bg-[#fedbd2] text-[#7a2318]'
                        }`}
                        title="Tambah ke Keranjang"
                        aria-label={`Tambah ${item.name} ke keranjang`}
                      >
                        {isAdded ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <ShoppingCart className="w-[18px] h-[18px] stroke-[2.2]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
