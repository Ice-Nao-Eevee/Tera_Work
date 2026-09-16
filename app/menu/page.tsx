'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart, Plus, ChevronRight, ChevronLeft, Star } from 'lucide-react';
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
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll logic for mobile
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const startScroll = () => {
      intervalId = setInterval(() => {
        const container = scrollContainerRef.current;
        if (!container || container.children.length === 0) return;
        
        // Only auto-scroll on mobile devices
        if (window.innerWidth < 768) {
          const firstCard = container.children[0] as HTMLElement;
          // card width + gap (gap-5 is 20px)
          const scrollAmount = firstCard.offsetWidth + 20;
          
          // Check if reached the end
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
          }
        }
      }, 3500);
    };

    startScroll();

    const container = scrollContainerRef.current;
    if (container) {
      const handleInteractionStart = () => clearInterval(intervalId);
      const handleInteractionEnd = () => startScroll();
      
      container.addEventListener('touchstart', handleInteractionStart, { passive: true });
      container.addEventListener('touchend', handleInteractionEnd, { passive: true });
      container.addEventListener('mouseenter', handleInteractionStart);
      container.addEventListener('mouseleave', handleInteractionEnd);
      
      return () => {
        clearInterval(intervalId);
        container.removeEventListener('touchstart', handleInteractionStart);
        container.removeEventListener('touchend', handleInteractionEnd);
        container.removeEventListener('mouseenter', handleInteractionStart);
        container.removeEventListener('mouseleave', handleInteractionEnd);
      };
    }

    return () => clearInterval(intervalId);
  }, []);

  const scrollLeftBtn = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const firstCard = container.children[0] as HTMLElement;
      // Scroll by 2 cards on desktop for faster navigation, or at least 1 card
      const scrollAmount = firstCard ? (firstCard.offsetWidth + 20) * 2 : 300;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRightBtn = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const firstCard = container.children[0] as HTMLElement;
      const scrollAmount = firstCard ? (firstCard.offsetWidth + 20) * 2 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Derived cart values — no redundant state, recalculated only when cartItems changes
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

  // Category icon mapping (emoji as placeholder, replace with real images later)
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
              {/* Warm gradient overlay so text on left stays clear while photo covers full box to slogan text */}
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
                {/* Circle — Enlarged without white background box */}
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

      {/* ─── MENU GRID ─── */}
      <div id="menu-grid" className="max-w-7xl mx-auto px-6 md:px-10 pt-8">
        <div className="flex justify-end mb-6">
          <Link href="/menu" className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#dcd1c4] bg-[#f5ebe0]/40 hover:bg-[#f3e8d6] text-[#8c5b3f] font-semibold text-sm transition-colors">
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

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
          <div className="flex flex-col gap-10">
            {/* FIRST ROW CAROUSEL */}
            <div className="relative group">
              <button
                onClick={scrollLeftBtn}
                className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[#ece8e3] text-[#b45309] shadow-lg rounded-full items-center justify-center z-10 transition-colors hover:bg-[#f3e8d6]"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollRightBtn}
                className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[#ece8e3] text-[#b45309] shadow-lg rounded-full items-center justify-center z-10 transition-colors hover:bg-[#f3e8d6]"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 [&::-webkit-scrollbar]:hidden"
                style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              >
                {filteredItems.map((item) => (
                  <div
                    key={`row1-${item.id || item._id}`}
                    className="min-w-[85vw] sm:min-w-[45vw] md:min-w-[30vw] lg:min-w-[22vw] snap-center shrink-0 bg-white rounded-2xl border border-[#ece8e3] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                  >
                    <Link href={`/menu/${item.id || item._id}`} className="block relative h-48 w-full bg-[#f5ede7] overflow-hidden group">
                      <Image
                        src={item.photoUrl || 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'}
                        alt={item.name || 'Menu'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    </Link>
                    <div className="px-4 py-5 flex flex-col items-center flex-grow">
                      <span className="font-bold text-[#8c5b3f] text-sm mb-1">
                        {formatRupiah(item.price || 0)}
                      </span>
                      <Link href={`/menu/${item.id || item._id}`} className="text-center w-full">
                        <h3 className="font-bold text-sm text-[#8c5b3f] uppercase mb-5 line-clamp-2 hover:text-[#b45309] transition-colors">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="w-full flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-[#b45309] text-[11px] font-bold">
                          <Star className="w-3.5 h-3.5 fill-[#d4bc8c] text-[#d4bc8c]" />
                          <span>4,6</span>
                        </div>
                        <button
                          onClick={(e) => handleQuickAdd(item, e)}
                          className="hover:text-[#b45309] transition-colors"
                          title="Tambah ke Keranjang"
                        >
                          <ChevronRight className="w-5 h-5 text-[#1a1207] hover:text-[#b45309]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pagination Dots Below First Row */}
              <div className="flex justify-center items-center gap-2 mt-4 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#8c5b3f]"></div>
                <div className="w-2 h-2 rounded-full bg-[#8c5b3f]/30"></div>
                <div className="w-2 h-2 rounded-full bg-[#8c5b3f]/30"></div>
              </div>
            </div>

            {/* SECOND ROW CAROUSEL (Duplicate to match the mockup exactly) */}
            <div className="relative group">
              <div 
                className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 [&::-webkit-scrollbar]:hidden"
                style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              >
                {filteredItems.map((item) => (
                  <div
                    key={`row2-${item.id || item._id}`}
                    className="min-w-[85vw] sm:min-w-[45vw] md:min-w-[30vw] lg:min-w-[22vw] snap-center shrink-0 bg-white rounded-2xl border border-[#ece8e3] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                  >
                    <Link href={`/menu/${item.id || item._id}`} className="block relative h-48 w-full bg-[#f5ede7] overflow-hidden group">
                      <Image
                        src={item.photoUrl || 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'}
                        alt={item.name || 'Menu'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    </Link>
                    <div className="px-4 py-5 flex flex-col items-center flex-grow">
                      <span className="font-bold text-[#8c5b3f] text-sm mb-1">
                        {formatRupiah(item.price || 0)}
                      </span>
                      <Link href={`/menu/${item.id || item._id}`} className="text-center w-full">
                        <h3 className="font-bold text-sm text-[#8c5b3f] uppercase mb-5 line-clamp-2 hover:text-[#b45309] transition-colors">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="w-full flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-[#b45309] text-[11px] font-bold">
                          <Star className="w-3.5 h-3.5 fill-[#d4bc8c] text-[#d4bc8c]" />
                          <span>4,6</span>
                        </div>
                        <button
                          onClick={(e) => handleQuickAdd(item, e)}
                          className="hover:text-[#b45309] transition-colors"
                          title="Tambah ke Keranjang"
                        >
                          <ChevronRight className="w-5 h-5 text-[#1a1207] hover:text-[#b45309]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
