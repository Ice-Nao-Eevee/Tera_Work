import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard · Selera Sambal',
  description: 'Panel administrasi Selera Sambal — kelola menu, pesanan, pelanggan, dan analitik restoran.',
};

// Admin section uses its own layout (no public header/footer/AI chat)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
