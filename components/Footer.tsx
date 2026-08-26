import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer id="tentang" className="bg-[#2a1a15] text-[#e5d5cf] pt-14 pb-8 px-6 md:px-12 border-t border-[#3d2720] scroll-mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Info */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-serif italic font-bold text-2xl md:text-3xl text-white tracking-wide">
            Selera Sambal
          </h3>
          <p className="text-sm leading-relaxed text-[#c2b2ac] max-w-lg">
            Berdiri sejak 14 November 2023, Selera Sambal hadir membawa racikan sambal ulek khas Nusantara yang autentik. Dibuat dari rempah segar pilihan dan resep rumahan, kami siap bikin momen makan nasi hangatmu jadi jauh lebih nikmat.
          </p>
        </div>

        {/* Layanan */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white text-base">Layanan</h4>
          <ul className="space-y-2 text-sm text-[#c2b2ac]">
            <li>
              <Link href="/menu" className="hover:text-white transition-colors">
                Dine-In
              </Link>
            </li>
            <li>
              <Link href="/menu" className="hover:text-white transition-colors">
                Ambil Sendiri
              </Link>
            </li>
            <li>
              <Link href="/menu" className="hover:text-white transition-colors">
                Katering
              </Link>
            </li>
          </ul>
        </div>

        {/* Hubungi Kami */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white text-base">Hubungi Kami</h4>
          <ul className="space-y-2 text-sm text-[#c2b2ac]">
            <li>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                WhatsApp
              </a>
            </li>
            <li>
              <a href="https://instagram.com/selerasambal" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Instagram
              </a>
            </li>
            <li>
              <a href="mailto:halo@selerasambal.id" className="hover:text-white transition-colors">
                Email Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#3d2720]/60 flex flex-col md:flex-row items-center justify-between text-xs text-[#9e8d87] gap-4">
        <p>&copy; 2026 Selera Sambal Nusantara. Hak Cipta Dilindungi.</p>
        <div className="flex gap-4">
          <Link href="/admin" className="hover:text-white transition-colors underline">
            Staff Portal / Admin Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
