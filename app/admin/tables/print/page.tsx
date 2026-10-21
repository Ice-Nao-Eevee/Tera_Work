'use client';

import React, { useEffect, useState } from 'react';
import { BRAND_NAME, adminHeaders, qrDataUrl, tableScanUrl } from '@/lib/tableQr';

interface PrintTable { id: string; tableNumber: number; qrToken: string; isActive: boolean; }

function QrCard({ url, tableNumber }: { url: string; tableNumber: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    qrDataUrl(url, 480).then((d) => alive && setSrc(d)).catch(() => {});
    return () => { alive = false; };
  }, [url]);
  return (
    <figure className="qr-card">
      <div className="qr-brand">{BRAND_NAME}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={`QR Meja ${tableNumber}`} className="qr-img" /> : <div className="qr-img" />}
      <figcaption className="qr-label">Meja {tableNumber}</figcaption>
    </figure>
  );
}

/** Print page: grid of labelled QR codes. Use the browser's Print / Save as PDF. */
export default function PrintTablesPage() {
  const [tables, setTables] = useState<PrintTable[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => {
    const authed = sessionStorage.getItem('ss_session') || localStorage.getItem('ss_remember');
    if (!authed) {
      setError('Silakan login ke dashboard admin terlebih dahulu.');
      setLoading(false);
      return;
    }
    fetch('/api/admin/tables', { headers: adminHeaders(), cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 401 ? 'Kunci admin diperlukan. Buka menu Meja di dashboard dan masukkan kunci admin.' : data.error || `HTTP ${res.status}`);
        setTables(data.tables || []);
        setBaseUrl(data.baseUrl || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = tables.filter((t) => (onlyActive ? t.isActive : true));

  return (
    <main className="print-root">
      <style>{`
        .print-root { font-family: 'DM Sans', system-ui, sans-serif; background:#f8f6f2; min-height:100vh; padding:24px; color:#292522; }
        .print-bar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .print-bar button { background:#aa2027; color:#fff; border:0; border-radius:9px; padding:10px 16px; font-weight:700; cursor:pointer; }
        .qr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
        .qr-card { margin:0; background:#fff; border:2px dashed #d4bc8c; border-radius:16px; padding:18px; text-align:center; break-inside:avoid; page-break-inside:avoid; }
        .qr-brand { font-family: Georgia, serif; font-style:italic; font-weight:700; color:#b45309; font-size:20px; }
        .qr-img { width:100%; max-width:200px; aspect-ratio:1/1; margin:10px auto; display:block; }
        .qr-label { font-weight:800; font-size:28px; color:#2a1a15; }
        @media print {
          .no-print { display:none !important; }
          .print-root { background:#fff; padding:0; }
          .qr-grid { grid-template-columns:repeat(3,1fr); gap:10mm; }
          .qr-card { border:1px solid #999; }
          @page { margin: 12mm; }
        }
      `}</style>
      <div className="print-bar no-print">
        <a href="/admin" style={{ fontSize: 14 }}>← Kembali</a>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cetak QR Meja</h1>
        <label style={{ fontSize: 14 }}>
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Hanya meja aktif
        </label>
        <button onClick={() => window.print()} disabled={!shown.length}>🖨 Cetak / Simpan PDF</button>
      </div>
      {loading && <p className="no-print">Memuat…</p>}
      {!loading && !error && (!baseUrl || /vercel\.app|localhost|127\.0\.0\.1/.test(baseUrl)) && (
        <p className="no-print" style={{ color: '#8a5a10' }}>
          ⚠ NEXT_PUBLIC_APP_URL belum diatur ke domain permanen{baseUrl ? ` (saat ini: ${baseUrl})` : ''}. Atur dulu di Vercel sebelum mencetak.
        </p>
      )}
      {error && <p className="no-print" style={{ color: '#c34040' }}>{error}</p>}
      <div className="qr-grid">
        {shown.map((t) => (
          <QrCard key={t.id} tableNumber={t.tableNumber} url={tableScanUrl(baseUrl, t.qrToken)} />
        ))}
      </div>
    </main>
  );
}
