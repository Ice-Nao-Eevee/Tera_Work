'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Utensils } from 'lucide-react';
import { getCartItems, getTableSession, storeEvents, CartItem, TableSession } from '@/lib/store';

interface HeaderProps {
  onToggleAiChat?: () => void;
  onOpenCart?: () => void;
}

export default function Header({ onToggleAiChat, onOpenCart }: HeaderProps) {
  const [cartCount, setCartCount] = useState<number>(0);
  const [tableSession, setTableSession] = useState<TableSession>({ tableId: 'table-5', tableNumber: 5 });
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    const items = getCartItems();
    const totalQty = items.reduce((acc: number, item: CartItem) => acc + item.qty, 0);
    setCartCount(totalQty);

    const session = getTableSession();
    setTableSession(session);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshData();
    const unsubscribe = storeEvents.subscribe(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

  return (
    <header className="sticky top-0 z-40 bg-[#fcf8f2]/95 backdrop-blur-md border-b border-[#e6cdac] px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-full bg-[#b45309] flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
          ☕
        </div>
        <span className="font-serif italic font-bold text-xl md:text-2xl text-[#b45309] tracking-tight">
          Warkop Betawa
        </span>
      </Link>

      {/* Nav Links (Desktop) */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#3e2723]">
        <Link href="/menu" className="hover:text-[#b45309] transition-colors">
          Menu Kami
        </Link>
        <Link href="/menu#promo" className="hover:text-[#b45309] transition-colors">
          Promo
        </Link>
        <Link href="/#tentang" className="hover:text-[#b45309] transition-colors">
          Tentang Kami
        </Link>
      </nav>

      {/* Right Nav Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Gemini AI Sparkle Icon Button */}
        <button
          onClick={onToggleAiChat}
          className="p-2 rounded-full hover:bg-[#ebdbb7] transition-colors relative group"
          title="Tanya Asisten AI Warkop Betawa"
          aria-label="Gemini AI Assistant"
        >
          <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
              fill="url(#sparkle-gradient)"
            />
            <defs>
              <linearGradient id="sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" />
                <stop offset="0.5" stopColor="#EC4899" />
                <stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* Table Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f3e8d6] border border-[#d4bc8c] rounded-full text-xs md:text-sm font-semibold text-[#b45309] shadow-xs">
          <Utensils className="w-3.5 h-3.5" />
          <span>Meja {isMounted ? tableSession.tableNumber : 5}</span>
        </div>

        {/* Cart Icon */}
        <button
          onClick={onOpenCart}
          className="p-2.5 rounded-full hover:bg-[#ebdbb7] transition-colors relative text-[#b45309]"
          aria-label="Keranjang Belanja"
        >
          <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
          {isMounted && cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#b45309] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#fcf8f2] animate-bounce">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
