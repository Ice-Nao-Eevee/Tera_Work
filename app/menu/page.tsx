'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, Plus, ChevronRight } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { getCartItems, addToCart, storeEvents, CartItem } from '@/lib/store';
import { STATIC_MENU_ITEMS, STATIC_CATEGORIES } from '@/lib/staticData';
import { IMenuItem, ICategory } from '@/lib/models';

export default function MenuPage() {
  const [categories, setCategories] = useState<ICategory[]>(STATIC_CATEGORIES);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [cartCount, setCartCount] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Load menu items from API or fallback memory
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

  // Synchronize local cart state
  const refreshCart = () => {
    const items = getCartItems();
    setCartItems(items);
    const count = items.reduce((sum, item) => sum + (item.qty || 0), 0);
    const total = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    setCartCount(count);
    setCartTotal(total);
  };

  useEffect(() => {
    refreshCart();
    const unsubscribe = storeEvents.subscribe(refreshCart);
    return () => unsubscribe();
  }, []);

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

  return (
    <main className="min-h-screen pb-32 bg-[#faf7f2]">
      {/* ─── TOP HEADER SECTION ─── */}
      <section className="bg-white border-b border-[#ece8e3] px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Title & Subtitle */}
          <div>
            <h1 className="font-serif font-bold text-4xl md:text-5xl text-[#1a1207] leading-tight">
              Rasa Nusantara
              <br />
              <span className="text-[#8c5b3f] italic">Sepenuh Hati</span>
            </h1>
            <p className="text-sm md:text-base text-[#7a6a5a] mt-3 font-normal max-w-lg">
              Setiap hidangan lahir dari resep turun-temurun dan bumbu rempah asli Indonesia.
            </p>
          </div>

          
        </div>
      </section>

            {/* ─── FILTER + CART ROW ─── */}
            <section className="bg-white border-b border-[#ece8e3] px-6 md:px-10 py-6 sticky top-[60px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto">

          {/* Search Bar (pindahan dari header) */}
          <div className="w-full lg:w-80 mb-5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#7a2323] absolute left-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari hidangan favoritmu..."
                className="w-full pl-11 pr-4 py-3 bg-[#fce9e4]/70 border border-[#f5c7bc] rounded-full text-sm text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none focus:border-[#7a2323] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 flex-1">
              {(categories || []).map((cat) => {
                const isActive = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-[#3d2010] text-white shadow-md'
                        : 'bg-white text-[#5a423a] border border-[#d6c8be] hover:bg-[#fce9e4]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Cart Box — Desktop: inline at top right */}
            {isMounted && (
              <div className="hidden lg:block flex-shrink-0">
                <div className="bg-[#7a2323] text-white rounded-2xl px-5 py-3 shadow-lg min-w-[260px]">
                  <div className="text-[10px] uppercase tracking-widest text-[#f5c7bc] font-semibold mb-0.5">
                    Keranjangmu
                  </div>
                  <div className="font-serif italic font-bold text-xl mb-3">
                    {cartCount} Items • {formatRupiah(cartTotal)}
                  </div>

                  {cartItems.length > 0 && (
                    <div className="space-y-1.5 mb-3 max-h-28 overflow-y-auto border-t border-[#8c2c22] pt-2.5">
                      {cartItems.map((ci) => {
                        if (!ci || !ci.menuItem || !ci.menuItem.name) return null;
                        return (
                          <div key={ci.id} className="flex justify-between items-center text-xs text-[#fdf1ee]">
                            <span className="truncate pr-2">{ci.menuItem.name}</span>
                            <span className="font-semibold text-white whitespace-nowrap">{formatRupiah(ci.lineTotal || 0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Link
                    href="/cart"
                    className="w-full py-2.5 bg-white hover:bg-[#fdf1ee] text-[#7a2323] font-bold text-xs rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Buka Keranjang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── MENU GRID ─── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8">
        <h2 className="font-serif italic font-bold text-2xl md:text-3xl text-[#2a1a15] mb-6">
          Paling Populer
        </h2>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#f5c7bc]">
            <p className="text-[#8c5950] font-medium">Hidangan tidak ditemukan.</p>
            <button
              onClick={() => {
                setSelectedCategory('semua');
                setSearchQuery('');
              }}
              className="mt-4 text-xs font-semibold text-[#7a2323] underline"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-[#ece8e3] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <Link href={`/menu/${item._id}`} className="block group">
                  {/* Image */}
                  <div className="relative h-44 w-full bg-[#f5ede7] overflow-hidden">
                    {/* Badge */}
                    {item.badge && item.badge !== 'none' && (
                      <div className="absolute top-3 left-3 z-10">
                        {item.badge === 'best_seller' && (
                          <span className="px-3 py-1 bg-[#7a2323] text-white text-[10px] font-bold rounded-full shadow">
                            Best Seller
                          </span>
                        )}
                        {item.badge === 'chefs_choice' && (
                          <span className="px-3 py-1 bg-[#b45309] text-white text-[10px] font-bold rounded-full shadow">
                            Chef&apos;s Choice
                          </span>
                        )}
                        {item.badge === 'vegan_friendly' && (
                          <span className="px-3 py-1 bg-[#15803d] text-white text-[10px] font-bold rounded-full shadow">
                            Vegan Friendly
                          </span>
                        )}
                      </div>
                    )}

                    <Image
                      src={item.photoUrl || 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'}
                      alt={item.name || 'Menu'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  </div>

                  {/* Content */}
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="font-bold text-base text-[#1a1207] group-hover:text-[#7a2323] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#7a6a5a] mt-1.5 line-clamp-2 leading-relaxed font-light">
                      {item.description}
                    </p>
                  </div>
                </Link>

                {/* Footer */}
                <div className="px-4 pb-4 pt-3 flex items-center justify-between mt-auto">
                  <span className="font-bold text-[#8c5b3f] text-sm">
                    {formatRupiah(item.price || 0)}
                  </span>
                  <button
                    onClick={(e) => handleQuickAdd(item, e)}
                    className="w-8 h-8 rounded-full bg-[#fce9e4] hover:bg-[#7a2323] text-[#7a2323] hover:text-white flex items-center justify-center transition-colors shadow-xs"
                    title="Tambah ke Keranjang"
                    aria-label={`Tambah ${item.name}`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MOBILE BOTTOM CART BAR ─── */}
      {isMounted && cartCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <div className="bg-[#7a2323] text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/20">
            <div>
              <div className="text-[11px] text-[#f5c7bc] uppercase font-semibold">Keranjangmu</div>
              <div className="font-serif font-bold text-lg">{cartCount} Items • {formatRupiah(cartTotal)}</div>
            </div>
            <Link
              href="/cart"
              className="px-5 py-2.5 bg-white text-[#7a2323] font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5"
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
