import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

export const metadata: Metadata = {
  title: 'Selera Sambal - QR Dine-In Ordering',
  description: 'Sistem pemesanan makanan QR Dine-In autentik khas Nusantara dari Selera Sambal.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#fdf1ee] text-[#2a1a15] min-h-screen flex flex-col antialiased">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
