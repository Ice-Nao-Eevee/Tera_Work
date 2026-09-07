'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIChatPanel from '@/components/AIChatPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Halaman admin punya header sendiri — sembunyikan public header/footer/AI
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return (
      <ErrorBoundary>{children}</ErrorBoundary>
    );
  }

  return (
    <>
      <Header onToggleAiChat={() => setIsAiOpen((prev) => !prev)} />
      <div className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <Footer />
      {isMounted && <AIChatPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />}
    </>
  );
}
