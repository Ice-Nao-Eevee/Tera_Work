'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, ArrowRight, Utensils } from 'lucide-react';
import { saveManualTableNumber } from '@/lib/store';

/**
 * Universal table entry point.
 *
 * The QR code in the restaurant now points to a single shared URL
 * (e.g. /menu directly, or /table/[N] as a cosmetic entry).
 * There is NO per-table token validation — the table number is purely
 * self-declared by the customer at checkout. This page is a welcome splash
 * that optionally pre-fills the table number from the URL path.
 */
function TableLandingContent() {
  const router = useRouter();
  const params = useParams();

  const rawTableId = (params?.tableId as string) || '';
  const match = rawTableId.match(/\d+/);
  const tableNumber = match ? parseInt(match[0], 10) : 0;

  useEffect(() => {
    // Pre-populate table number from URL so the checkout field is pre-filled
    if (tableNumber > 0) {
      saveManualTableNumber(tableNumber);
    }
  }, [tableNumber]);

  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center relative p-6 bg-[#2a1a15]">
      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-45 mix-blend-overlay">
        <Image
          src="/foodbg.jpg"
          alt="Food background"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 z-0 bg-black/30" />

      {/* Welcome Card */}
      <div className="relative z-10 bg-[#fcf8f2] border border-[#d4bc8c] rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-[#b45309] flex items-center justify-center mx-auto mb-6 shadow-xs">
          <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
        </div>

        <span className="text-xs uppercase tracking-widest font-semibold text-[#8c5950] mb-2 block">
          Selamat Datang
        </span>

        <h2 className="font-serif italic text-3xl md:text-4xl font-bold text-[#b45309] mb-3">
          Warkop Betawa
        </h2>

        {tableNumber > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-lg font-bold text-[#b45309] mb-6">
            <Utensils className="w-5 h-5" />
            <span>Meja {tableNumber}</span>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        <p className="text-sm text-[#5a423a] mb-8 leading-relaxed">
          Silakan jelajahi menu makanan dan minuman khas Nusantara kami, tentukan pilihan, dan pesan langsung dari HP Anda.
          {tableNumber === 0 && (
            <span className="block mt-2 text-[#8c5950] font-medium">
              Anda akan diminta memasukkan nomor meja saat checkout.
            </span>
          )}
        </p>

        <button
          onClick={() => router.push('/menu')}
          className="w-full py-4 bg-[#b45309] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
        >
          <span>Lihat Menu</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </main>
  );
}

export default function TableLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#2a1a15] text-[#fcf8f2]">
          Memuat...
        </div>
      }
    >
      <TableLandingContent />
    </Suspense>
  );
}
