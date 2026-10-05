'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIChatPanel from '@/components/AIChatPanel';
import FloatingCart from '@/components/FloatingCart';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { uiEvents } from '@/lib/store';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const unsubCart = uiEvents.subscribeCart(() => setIsCartOpen(true));
    const unsubAi = uiEvents.subscribeAi(() => setIsAiOpen((prev) => !prev));
    return () => {
      unsubCart();
      unsubAi();
    };
  }, []);

  // Halaman admin punya header sendiri — sembunyikan public header/footer/AI
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return (
      <ErrorBoundary>{children}</ErrorBoundary>
    );
  }

  // Halaman menu utama menggunakan layout Left Sidebar + Hero + Footer terintegrasi sesuai Gambar 1
  const isMenuPage = pathname === '/' || pathname === '/menu';

  return (
    <>
      {!isMenuPage && (
        <Header
          onToggleAiChat={() => setIsAiOpen((prev) => !prev)}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}
      <div className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      {!isMenuPage && isMounted && <AIChatPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />}
      {!isMenuPage && isMounted && <FloatingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </>
  );
}
