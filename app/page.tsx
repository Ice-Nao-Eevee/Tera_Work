'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-80px)] flex flex-col justify-between relative bg-[#2a1a15] text-white overflow-hidden">
      {/* Background Image with Dark Gradient Overlay matching desktop-welcome screenshot */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
        <Image
          src="/foodbg.jpg"
          alt="Selera Sambal Background"
          fill
          priority
          className="object-cover object-center"
          onError={(e) => {
            // Fallback if foodbg image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#2a1a15] via-[#2a1a15]/60 to-transparent" />

      {/* Hero Content Container */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-20 flex-1 flex flex-col justify-center items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fce9e4]/15 border border-[#fce9e4]/30 backdrop-blur-sm text-xs md:text-sm font-medium text-[#fce9e4] mb-8">
          <Star className="w-3.5 h-3.5 fill-[#f5c7bc] text-[#f5c7bc]" />
          <span>100+ Cita Rasa Istimewa</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-serif italic text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 leading-tight">
          Selera Sambal
        </h1>

        <div className="font-serif italic text-4xl md:text-6xl text-[#f3d9d3] mb-6">
          Rasa Favoritmu
        </div>

        <p className="text-base md:text-xl text-[#e5d5cf] font-light max-w-2xl mb-10 leading-relaxed">
          Pilih menu yang kamu suka, lalu pesan! Setiap hidangan racikan khas Nusantara diolah dengan bumbu rempah segar istimewa.
        </p>

        {/* CTA Button matching reference screenshot */}
        <Link
          href="/menu"
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-lg rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <span>Lihat Menu</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </main>
  );
}
