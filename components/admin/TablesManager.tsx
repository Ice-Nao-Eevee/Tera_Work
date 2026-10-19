'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  adminHeaders, downloadTableQrPng, qrDataUrl, setAdminKey, tableScanUrl,
} from '@/lib/tableQr';

interface AdminTable {
  id: string;
  tableNumber: number;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

const iCls = 'w-full bg-white border border-[#e9e3dc] rounded-[8px] text-[#292522] outline-0 px-[11px] py-[10px] text-sm focus:border-[#aa2027] focus:shadow-[0_0_0_3px_#f8e3e3]';
const bPri = 'inline-flex items-center justify-center gap-2 font-bold px-[14px] py-[10px] rounded-[9px] bg-[#aa2027] hover:bg-[#76131a] text-white text-sm transition-colors disabled:opacity-50';
const bSec = 'inline-flex items-center justify-center gap-2 font-bold px-[14px] py-[10px] rounded-[9px] bg-white border border-[#e9e3dc] text-[#292522] text-sm transition-colors hover:bg-[#f3eeea]';
const card = 'bg-white border border-[#e9e3dc] rounded-[16px] shadow-[0_10px_30px_rgba(65,39,23,.07)]';

function QrPreview({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    qrDataUrl(url, 160).then((d) => alive && setSrc(d)).catch(() => {});
    return () => { alive = false; };
  }, [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR meja" width={72} height={72} className="rounded-md border border-[#e9e3dc]" /> : <div className="w-[72px] h-[72px] rounded-md bg-[#f3eeea]" />;
}

export default function TablesManager({ onToast }: { onToast: (m: string) => void }) {
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [single, setSingle] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('20');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; confirmLabel: string; run: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tables', { headers: adminHeaders(), cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { setNeedKey(true); setTables([]); return; }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNeedKey(false);
      setTables(data.tables || []);
      setBaseUrl(data.baseUrl || '');
    } catch (e: any) {
      setError(e.message || 'Gagal memuat meja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: adminHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { setNeedKey(true); throw new Error(data.error || 'Kunci admin tidak valid.'); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const msg = await fn();
      if (msg) onToast(msg);
      await load();
    } catch (e: any) {
      onToast(e.message || 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  const addSingle = () => run(async () => {
    await call('/api/admin/tables', 'POST', { tableNumber: Number(single) });
    setSingle('');
    return `Meja ${single} ditambahkan`;
  });
  const addRange = () => run(async () => {
    const d = await call('/api/admin/tables', 'POST', { from: Number(from), to: Number(to) });
    return `${d.created} meja dibuat${d.skipped ? `, ${d.skipped} dilewati (sudah ada)` : ''}`;
  });
  const toggle = (t: AdminTable) => run(async () => {
    await call(`/api/admin/tables/${t.id}`, 'PATCH', { isActive: !t.isActive });
    return `Meja ${t.tableNumber} ${t.isActive ? 'dinonaktifkan' : 'diaktifkan'}`;
  });
  const regenerate = (t: AdminTable) => setConfirm({
    message: `Regenerate token Meja ${t.tableNumber}? QR lama yang sudah dicetak akan berhenti berfungsi dan harus dicetak ulang.`,
    confirmLabel: 'Regenerate',
    run: () => run(async () => {
      await call(`/api/admin/tables/${t.id}`, 'PATCH', { regenerateToken: true });
      return `Token Meja ${t.tableNumber} diperbarui`;
    }),
  });
  const remove = (t: AdminTable) => setConfirm({
    message: `Hapus Meja ${t.tableNumber}? Tindakan ini tidak bisa dibatalkan.`,
    confirmLabel: 'Hapus',
    run: () => run(async () => {
      await call(`/api/admin/tables/${t.id}`, 'DELETE');
      return `Meja ${t.tableNumber} dihapus`;
    }),
  });
  const download = (t: AdminTable) => downloadTableQrPng(tableScanUrl(baseUrl, t.qrToken), t.tableNumber)
    .catch((e) => onToast(e.message || 'Gagal mengunduh QR'));

  const saveKey = () => { setAdminKey(keyInput.trim()); setKeyInput(''); load(); };

  const unsafeBase = !baseUrl || /vercel\.app|localhost|127\.0\.0\.1/.test(baseUrl);

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-[18px] flex-wrap">
        <div>
          <h1 className="text-[clamp(22px,3vw,30px)] font-bold tracking-[-0.04em] m-0 mb-[5px]">Meja &amp; QR</h1>
          <p className="text-[#827a73] m-0 text-sm">Satu QR unik per meja. Pelanggan cukup scan, nomor meja terisi otomatis.</p>
        </div>
        <a href="/admin/tables/print" target="_blank" rel="noreferrer" className={bPri}>🖨 Cetak Semua QR</a>
      </div>

      {unsafeBase && (
        <div className="rounded-[12px] border border-[#f0d9a8] bg-[#fff8e6] text-[#8a5a10] text-sm px-4 py-3">
          ⚠ <b>NEXT_PUBLIC_APP_URL</b> belum diatur ke domain permanen{baseUrl ? ` (saat ini: ${baseUrl})` : ''}. QR yang dicetak harus memakai domain custom tetap, bukan preview/*.vercel.app/localhost, agar tetap valid.
        </div>
      )}

      {needKey && (
        <section className={`${card} p-5 grid gap-3 max-w-[480px]`}>
          <b>Kunci Admin diperlukan</b>
          <p className="text-sm text-[#827a73] m-0">Masukkan nilai <code>ADMIN_API_KEY</code> server untuk mengelola QR meja.</p>
          <input type="password" className={iCls} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="ADMIN_API_KEY" onKeyDown={(e) => e.key === 'Enter' && saveKey()} />
          <button className={bPri} onClick={saveKey} disabled={!keyInput.trim()}>Simpan &amp; Muat</button>
        </section>
      )}

      {!needKey && (
        <>
          <section className={`${card} p-5 grid gap-4 md:grid-cols-2`}>
            <div className="grid gap-2">
              <b className="text-sm">Tambah satu meja</b>
              <div className="flex gap-2">
                <input type="number" min={1} className={iCls} value={single} onChange={(e) => setSingle(e.target.value)} placeholder="Nomor meja" />
                <button className={bPri} onClick={addSingle} disabled={busy || !single}>Tambah</button>
              </div>
            </div>
            <div className="grid gap-2">
              <b className="text-sm">Buat banyak meja (rentang)</b>
              <div className="flex gap-2 items-center">
                <input type="number" min={1} className={iCls} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari" />
                <span className="text-[#827a73]">–</span>
                <input type="number" min={1} className={iCls} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai" />
                <button className={bPri} onClick={addRange} disabled={busy || !from || !to}>Buat</button>
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-[#c34040] m-0">{error}</p>}
          {loading && <p className="text-sm text-[#827a73] m-0">Memuat…</p>}

          <section className={`${card} overflow-auto`}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['QR', 'Meja', 'Status', 'Pesanan', 'Aksi'].map((h) => (
                    <th key={h} className="text-[11px] font-bold uppercase tracking-[.05em] text-[#827a73] text-left border-b border-[#e9e3dc] px-3 py-3 first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t.id}>
                    <td className="border-b border-[#e9e3dc] px-3 py-3 first:pl-5"><QrPreview url={tableScanUrl(baseUrl, t.qrToken)} /></td>
                    <td className="border-b border-[#e9e3dc] px-3 py-3 text-sm font-bold">Meja {t.tableNumber}</td>
                    <td className="border-b border-[#e9e3dc] px-3 py-3 text-sm">
                      <span className={`inline-block rounded-full text-[11px] font-bold px-[9px] py-[5px] ${t.isActive ? 'bg-[#e8f5ee] text-[#25805b]' : 'bg-[#fbe7e7] text-[#c34040]'}`}>{t.isActive ? 'Aktif' : 'Nonaktif'}</span>
                    </td>
                    <td className="border-b border-[#e9e3dc] px-3 py-3 text-sm">{t.orderCount}</td>
                    <td className="border-b border-[#e9e3dc] px-3 py-3 last:pr-5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <button className={bSec} onClick={() => download(t)}>⬇ PNG</button>
                        <button className={bSec} onClick={() => toggle(t)} disabled={busy}>{t.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button className={bSec} onClick={() => regenerate(t)} disabled={busy}>↻ Token</button>
                        {t.orderCount === 0 && <button className={bSec} onClick={() => remove(t)} disabled={busy}>Hapus</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && tables.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#827a73]">Belum ada meja. Tambahkan meja di atas.</td></tr>
                )}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-[#827a73] m-0">Meja yang sudah memiliki pesanan tidak bisa dihapus — nonaktifkan saja.</p>
        </>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-[18px] bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <section className="bg-white rounded-[18px] shadow-[0_20px_60px_#0004] w-full max-w-[460px] p-[25px]" role="dialog" aria-modal="true">
            <h2 className="text-[19px] font-bold m-0 mb-3">Konfirmasi</h2>
            <p className="text-[#827a73] mb-4">{confirm.message}</p>
            <div className="flex justify-end gap-2">
              <button className={bSec} onClick={() => setConfirm(null)}>Batal</button>
              <button className="px-4 py-2 rounded-[9px] bg-[#fdecec] text-[#c34040] text-sm font-bold hover:bg-[#fbd6d6]" onClick={() => { const r = confirm.run; setConfirm(null); r(); }}>{confirm.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
