'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, ArrowRight, Utensils, XCircle } from 'lucide-react';
import { saveTableSession } from '@/lib/store';
import { createClient } from '@/utils/supabase/client';

function TableLandingContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const rawTableId = (params?.tableId as string) || '5';
  const token = searchParams.get('token') || '';

  const [tableNumber, setTableNumber] = useState<number>(5);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAndSave = async () => {
      // Extract table number (e.g. "table-5" or "5")
      const match = rawTableId.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 5;
      setTableNumber(num);

      const tableId = rawTableId.startsWith('table-') ? rawTableId : `table-${num}`;

      // Validate QR token against Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tables')
        .select('table_number, qr_token, is_active')
        .eq('qr_token', token)
        .eq('id', tableId)
        .single();

      if (error || !data || !data.is_active) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // Save session in local storage
      saveTableSession({
        tableId,
        tableNumber: num,
        qrToken: token,
      });

      setIsValid(true);
      setIsValidating(false);
    };

    validateAndSave();
  }, [rawTableId, token]);

  const handleGoToMenu = () => {
    router.push('/menu');
  };

  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center relative p-6 bg-[#2a1a15]">
      {/* Food Background Image */}
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

      {/* Loading State */}
      {isValidating && (
        <div className="relative z-10 bg-[#fdf1ee] border border-[#f5c7bc] rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl">
          <div className="w-10 h-10 border-4 border-[#f5c7bc] border-t-[#7a2323] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5a423a] text-sm font-medium">Memverifikasi QR Code...</p>
        </div>
      )}

      {/* Invalid QR State */}
      {!isValidating && !isValid && (
        <div className="relative z-10 bg-[#fdf1ee] border border-[#f5c7bc] rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-[#7a2323] flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-9 h-9 stroke-[2.2]" />
          </div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#8c5950] mb-2 block">
            QR Code Tidak Valid
          </span>
          <h2 className="font-serif italic text-3xl md:text-4xl font-bold text-[#7a2323] mb-3">
            Akses Ditolak
          </h2>
          <p className="text-sm text-[#5a423a] leading-relaxed">
            QR Code tidak dikenali atau meja tidak aktif. Silakan scan ulang QR Code yang tertera di meja Anda.
          </p>
        </div>
      )}

      {/* Success State */}
      {!isValidating && isValid && (
        <div className="relative z-10 bg-[#fdf1ee] border border-[#f5c7bc] rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-[#7a2323] flex items-center justify-center mx-auto mb-6 shadow-xs">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>

          <span className="text-xs uppercase tracking-widest font-semibold text-[#8c5950] mb-2 block">
            QR Code Terverifikasi
          </span>

          <h2 className="font-serif italic text-3xl md:text-4xl font-bold text-[#7a2323] mb-3">
            Scan Berhasil!
          </h2>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-lg font-bold text-[#7a2323] mb-6">
            <Utensils className="w-5 h-5" />
            <span>Selamat Datang di Meja {tableNumber}</span>
          </div>

          <p className="text-sm text-[#5a423a] mb-8 leading-relaxed">
            Silakan jelajahi menu makanan dan minuman khas Nusantara kami, tentukan pilihan, dan pesan langsung dari HP Anda.
          </p>

          <button
            onClick={handleGoToMenu}
            className="w-full py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
          >
            <span>Menu Utama</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </main>
  );
}

export default function TableLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#2a1a15] text-[#fdf1ee]">
          Memuat data meja...
        </div>
      }
    >
      <TableLandingContent />
    </Suspense>
  );
}
