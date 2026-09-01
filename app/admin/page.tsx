'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ActivePage =
  | 'dashboard' | 'products' | 'categories' | 'orders' | 'customers'
  | 'analytics' | 'promotions' | 'inventory' | 'reviews' | 'notifications' | 'settings';

// ── Types matching the MongoDB models ────────────────────────────────────────
interface Product {
  _id: string; id?: string;
  name: string; category: string; price: number; isActive: boolean;
  badge?: string; photoUrl: string; description: string;
  spiceLevels: { label: string; priceModifier: number }[];
  addOns: { label: string; price: number }[];
  createdAt?: string;
}
interface Category { _id: string; id?: string; name: string; slug: string; sortOrder: number; description?: string; createdAt?: string; }
interface OrderItem { name: string; qty: number; price: number; lineTotal: number; spiceLevel?: string; addOns?: { label: string; price: number }[]; }
interface Order { _id?: string; id?: string; orderCode: string; tableNumber: number; items: OrderItem[]; notes?: string; subtotal: number; taxAmount: number; serviceChargeAmount: number; total: number; status: string; createdAt?: string; updatedAt?: string; }
interface Promotion { _id: string; title: string; description: string; originalPrice: number; discountedPrice: number; isActive: boolean; createdAt?: string; }
interface Review { id: string; customer: string; menu: string; rating: number; comment: string; status: string; createdAt: string; }
interface Notification { id: string; text: string; read: boolean; createdAt: string; }
interface Restaurant { name: string; description?: string; phone?: string; email: string; address: string; hours?: string; instagram: string; whatsapp: string; logo?: string; }
interface AppSettings { taxRatePercent: number; serviceChargeRatePercent: number; restaurantInfo: Restaurant; }
interface AdminUser { name: string; username: string; password: string; avatar: string; }

// ── Local-only helpers (session / notifications / admin login) ───────────────
const SS_PREFIX = 'ss_admin_';
const DEFAULTS = {
  settings: { taxRatePercent: 10, serviceChargeRatePercent: 5, restaurantInfo: { name: 'Selera Sambal', address: '', whatsapp: '', instagram: '', email: '' } } as AppSettings,
  admin: { name: 'Admin Selera', username: 'admin', password: 'admin123', avatar: '' } as AdminUser,
};
function ssGet<T>(key: string): T { try { return JSON.parse(localStorage.getItem(SS_PREFIX + key) ?? 'null') ?? (DEFAULTS as any)[key] ?? []; } catch { return (DEFAULTS as any)[key] ?? [] as any; } }
function ssSet<T>(key: string, value: T): T { localStorage.setItem(SS_PREFIX + key, JSON.stringify(value)); return value; }
function ssId(prefix = 'ID') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
function ssNotify(text: string) { ssSet('notifications', [...ssGet<Notification[]>('notifications'), { id: ssId('NOT'), text, read: false, createdAt: new Date().toISOString() }]); }
function rupiah(v: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v) || 0); }
function fmtDate(v: string) { return v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—'; }

// ── Shared API helper ────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── UI Micro-components (unchanged from original) ────────────────────────────
function Badge({ status }: { status: string }) {
  const cls = /tersedia|aktif|aman|selesai|dibaca|completed|ready/i.test(status) ? 'bg-[#e8f5ee] text-[#25805b]' : /baru|diproses|siap|menipis|received|preparing/i.test(status) ? 'bg-[#fff0df] text-[#bb7420]' : /habis|nonaktif|dibatalkan/i.test(status) ? 'bg-[#fbe7e7] text-[#c34040]' : 'bg-[#f0edeb] text-[#625a56]';
  return <span className={`inline-block rounded-full text-[11px] font-bold px-[9px] py-[5px] ${cls}`}>{status}</span>;
}
function EmptyState({ icon = '◌', title, text, action }: { icon?: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center min-h-[170px] gap-2 text-[#827a73] text-center"><span className="w-[52px] h-[52px] bg-[#f8ece8] rounded-full grid place-items-center text-2xl text-[#aa2027]">{icon}</span><b className="text-[#292522] text-[15px]">{title}</b><span className="text-sm">{text}</span>{action}</div>;
}
function Toast({ message, onRemove }: { message: string; onRemove: () => void }) {
  useEffect(() => { const t = setTimeout(onRemove, 3200); return () => clearTimeout(t); }, [onRemove]);
  return <div className="ss-rise bg-[#282222] text-white rounded-[10px] px-4 py-3 shadow-lg text-sm flex items-center gap-2"><span className="text-[#7de2ae] font-bold">✓</span> {message}</div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center p-[18px] bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="ss-rise bg-white rounded-[18px] shadow-[0_20px_60px_#0004] w-full max-w-[680px] max-h-[calc(100vh-36px)] overflow-auto p-[25px]" role="dialog" aria-modal="true">
        <header className="flex items-center justify-between mb-[18px]"><h2 className="text-[19px] font-bold m-0">{title}</h2><button onClick={onClose} className="text-xl leading-none px-2 py-1 rounded-lg hover:bg-[#f3eeea]" aria-label="Tutup">×</button></header>
        {children}
      </section>
    </div>
  );
}
function ConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  return <Modal title="Konfirmasi" onClose={onClose}><p className="text-[#827a73] mb-4">{message}</p><div className="flex justify-end gap-2 mt-5"><button onClick={onClose} className="px-4 py-2 rounded-[9px] border border-[#e9e3dc] bg-white text-sm font-bold hover:bg-[#f3eeea]">Batal</button><button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded-[9px] bg-[#fdecec] text-[#c34040] text-sm font-bold hover:bg-[#fbd6d6]">Hapus</button></div></Modal>;
}
function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return null;
  return <section className="bg-white border border-[#e9e3dc] rounded-[16px] shadow-[0_10px_30px_rgba(65,39,23,.07)] overflow-auto"><table className="w-full border-collapse"><thead><tr>{headers.map((h, i) => <th key={i} className="text-[11px] font-bold uppercase tracking-[.05em] text-[#827a73] text-left border-b border-[#e9e3dc] px-3 py-3 first:pl-5 last:pr-5">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="border-b border-[#e9e3dc] px-3 py-3 text-sm first:pl-5 last:pr-5 text-[#292522]">{cell}</td>)}</tr>)}</tbody></table></section>;
}
function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="bg-transparent border-0 rounded-[7px] text-[#827a73] px-[6px] py-[6px] text-xs hover:bg-[#f4efeb] hover:text-[#aa2027]">{children}</button>; }
function PageHeading({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) { return <div className="flex items-start justify-between gap-[18px] mb-[25px]"><div><h1 className="text-[clamp(22px,3vw,30px)] font-bold tracking-[-0.04em] m-0 mb-[5px]">{title}</h1><p className="text-[#827a73] m-0 text-sm">{desc}</p></div>{action}</div>; }
function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) { return <article className="bg-white border border-[#e9e3dc] rounded-[16px] shadow-[0_10px_30px_rgba(65,39,23,.07)] p-[19px]"><span className="w-[38px] h-[38px] bg-[#f9e8e5] rounded-[10px] grid place-items-center text-[18px] text-[#aa2027]">{icon}</span><p className="text-[#827a73] mt-[14px] mb-[4px] text-sm">{label}</p><strong className="text-[24px] font-bold tracking-[-0.03em] text-[#292522]">{value}</strong></article>; }

const iCls = "w-full bg-white border border-[#e9e3dc] rounded-[8px] text-[#292522] outline-0 px-[11px] py-[10px] text-sm focus:border-[#aa2027] focus:shadow-[0_0_0_3px_#f8e3e3]";
const bPri = "inline-flex items-center justify-center gap-2 font-bold px-[14px] py-[10px] rounded-[9px] bg-[#aa2027] hover:bg-[#76131a] text-white text-sm transition-colors";
const bSec = "inline-flex items-center justify-center gap-2 font-bold px-[14px] py-[10px] rounded-[9px] bg-white border border-[#e9e3dc] text-[#292522] text-sm transition-colors hover:bg-[#f3eeea]";

// ── ProductForm (wired to /api/menu) ─────────────────────────────────────────
function ProductForm({ product, categories, onClose, onSaved }: { product?: Product; categories: Category[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, sf] = useState({
    name: product?.name || '',
    category: product?.category || '',
    price: product?.price ?? '',
    badge: product?.badge || 'none',
    photoUrl: product?.photoUrl || '',
    description: product?.description || '',
    isActive: product?.isActive ?? true,
    spiceLevels: product?.spiceLevels || [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: product?.addOns || [] as { label: string; price: number }[],
  });
  const [addOnInput, setAddOnInput] = useState({ label: '', price: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => sf(x => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...f, price: Number(f.price) };
      if (product?._id) {
        await apiFetch(`/api/menu/${product._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        onSaved('Menu berhasil diperbarui');
      } else {
        await apiFetch('/api/menu', { method: 'POST', body: JSON.stringify(payload) });
        onSaved('Menu berhasil ditambahkan');
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan menu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? 'Edit Menu' : 'Tambah Menu'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <label className="grid text-xs font-bold gap-[6px]">Nama Menu<input className={iCls} required value={f.name} onChange={e => set('name', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Kategori (slug)<select className={iCls} value={f.category} onChange={e => set('category', e.target.value)}><option value="">Pilih kategori</option>{categories.filter(c => c.slug !== 'semua').map(c => <option key={c._id} value={c.slug}>{c.name}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Harga<input className={iCls} type="number" min="0" required value={f.price} onChange={e => set('price', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Badge<select className={iCls} value={f.badge} onChange={e => set('badge', e.target.value)}>{['none', 'best_seller', 'chefs_choice', 'vegan_friendly'].map(b => <option key={b} value={b}>{b}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}><option value="true">Tersedia</option><option value="false">Nonaktif</option></select></label>
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Foto URL<input className={iCls} value={f.photoUrl} onChange={e => set('photoUrl', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Deskripsi<textarea className={`${iCls} min-h-[80px] resize-y`} value={f.description} onChange={e => set('description', e.target.value)} /></label>
          <div className="sm:col-span-2">
            <p className="text-xs font-bold mb-2">Add-Ons</p>
            <div className="flex gap-2 mb-2">
              <input className={iCls} placeholder="Nama add-on" value={addOnInput.label} onChange={e => setAddOnInput(x => ({ ...x, label: e.target.value }))} />
              <input className={`${iCls} w-28`} type="number" min="0" placeholder="Harga" value={addOnInput.price} onChange={e => setAddOnInput(x => ({ ...x, price: e.target.value }))} />
              <button type="button" className={bSec} onClick={() => { if (addOnInput.label) { set('addOns', [...f.addOns, { label: addOnInput.label, price: Number(addOnInput.price) }]); setAddOnInput({ label: '', price: '' }); } }}>+</button>
            </div>
            {f.addOns.map((a, i) => <div key={i} className="flex items-center gap-2 text-sm mb-1"><span className="flex-1">{a.label} — {rupiah(a.price)}</span><button type="button" onClick={() => set('addOns', f.addOns.filter((_, j) => j !== i))} className="text-[#c34040] text-xs">×</button></div>)}
          </div>
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Menu'}</button></div>
      </form>
    </Modal>
  );
}

// ── OrderDetailModal (wired to PATCH /api/orders/[id]) ───────────────────────
function OrderDetailModal({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: (m: string) => void }) {
  const [status, setStatus] = useState(order.status);
  const [showDel, setShowDel] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveStatus = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(order.orderCode)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      onSaved('Status pesanan diperbarui');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async () => {
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(order.orderCode)}`, { method: 'DELETE' });
      onSaved('Pesanan berhasil dihapus');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pesanan');
    }
  };

  return (
    <>{' '}
      <Modal title={`Order ${order.orderCode}`} onClose={onClose}>
        <h2 className="font-bold text-center mb-1">SELERA SAMBAL</h2>
        <p className="text-[#827a73] text-xs text-center mb-3">{fmtDate(order.createdAt || '')} · Meja {order.tableNumber}</p>
        <hr className="border-[#e9e3dc] mb-3" />
        {order.items.map((item, i) => <div key={i} className="flex justify-between text-sm mb-2"><span>{item.name} × {item.qty}</span><b>{rupiah(item.price * item.qty)}</b></div>)}
        <hr className="border-[#e9e3dc] my-3" />
        <div className="flex justify-between text-sm mb-1 text-[#827a73]"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
        <div className="flex justify-between text-sm mb-1 text-[#827a73]"><span>Pajak + Service</span><span>{rupiah((order.taxAmount || 0) + (order.serviceChargeAmount || 0))}</span></div>
        <div className="flex justify-between text-sm font-bold mb-4"><b>Total</b><b>{rupiah(order.total)}</b></div>
        <label className="grid text-xs font-bold gap-[6px] mb-4">Status Pesanan<select className={iCls} value={status} onChange={e => setStatus(e.target.value)}>{['received','preparing','ready','completed'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <div className="flex justify-end gap-[9px]">
          <button onClick={() => setShowDel(true)} className="inline-flex items-center gap-2 font-bold px-4 py-[10px] rounded-[9px] bg-[#fdecec] text-[#c34040] text-sm hover:bg-[#fbd6d6]">Hapus</button>
          <button onClick={() => window.print()} className={bSec}>Cetak Invoice</button>
          <button onClick={saveStatus} className={bPri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Status'}</button>
        </div>
      </Modal>
      {showDel && <ConfirmModal message="Hapus pesanan ini dari database?" onConfirm={deleteOrder} onClose={() => setShowDel(false)} />}
    </>
  );
}

// ── PromoForm (wired to /api/promos) ─────────────────────────────────────────
function PromoForm({ promo, onClose, onSaved }: { promo?: Promotion; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, sf] = useState({
    title: promo?.title || '',
    description: promo?.description || '',
    originalPrice: promo?.originalPrice ?? '',
    discountedPrice: promo?.discountedPrice ?? '',
    isActive: promo?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => sf(x => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...f, originalPrice: Number(f.originalPrice), discountedPrice: Number(f.discountedPrice) };
      if (promo?._id) {
        await apiFetch(`/api/promos/${promo._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        onSaved('Promo berhasil diperbarui');
      } else {
        await apiFetch('/api/promos', { method: 'POST', body: JSON.stringify(payload) });
        onSaved('Promo berhasil ditambahkan');
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan promo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={promo ? 'Edit Promo' : 'Tambah Promo'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Judul Promo<input className={iCls} required value={f.title} onChange={e => set('title', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Harga Asli<input className={iCls} type="number" min="0" required value={f.originalPrice} onChange={e => set('originalPrice', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Harga Promo<input className={iCls} type="number" min="0" required value={f.discountedPrice} onChange={e => set('discountedPrice', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Deskripsi<textarea className={`${iCls} min-h-[80px] resize-y`} value={f.description} onChange={e => set('description', e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Promo'}</button></div>
      </form>
    </Modal>
  );
}

// ── CategoryForm (wired to /api/categories) ──────────────────────────────────
function CategoryForm({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, sf] = useState({ name: category?.name || '', description: category?.description || '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => sf(x => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (category?._id) {
        await apiFetch(`/api/categories/${category._id}`, { method: 'PUT', body: JSON.stringify(f) });
        onSaved('Kategori berhasil diperbarui');
      } else {
        await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(f) });
        onSaved('Kategori berhasil ditambahkan');
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={category ? 'Edit Kategori' : 'Tambah Kategori'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <label className="grid text-xs font-bold gap-[6px]">Nama Kategori<input className={iCls} required value={f.name} onChange={e => set('name', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Deskripsi<input className={iCls} value={f.description} onChange={e => set('description', e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
      </form>
    </Modal>
  );
}

// ── DashboardPage ─────────────────────────────────────────────────────────────
function DashboardPage({ onToast }: { onToast: (m: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPF, setShowPF] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [mData, oData, cData] = await Promise.all([
        apiFetch<{ menuItems: Product[] }>('/api/menu'),
        apiFetch<{ orders: Order[] }>('/api/orders'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
      ]);
      setProducts(mData.menuItems || []);
      setOrders(oData.orders || []);
      setCategories(cData.categories || []);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const active = orders.filter(o => o.status !== 'completed');
  const revenue = active.reduce((s, o) => s + Number(o.total), 0);
  const sold = active.reduce((s, o) => s + o.items.reduce((c, i) => c + Number(i.qty), 0), 0);
  const recent = orders.slice(0, 5);

  if (loading) return <div className="text-[#827a73] text-sm">Memuat dashboard...</div>;

  return (
    <div>
      <PageHeading title="Selamat datang, Admin" desc="Ringkasan operasional Selera Sambal hari ini." action={<button onClick={() => setShowPF(true)} className={bPri}>+ Tambah Menu</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5"><StatCard icon="▣" label="Total Menu" value={products.length} /><StatCard icon="◉" label="Menu Terjual" value={sold} /><StatCard icon="Rp" label="Pendapatan" value={rupiah(revenue)} /><StatCard icon="▤" label="Pesanan" value={orders.length} /></div>
      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-[18px] mb-5">
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-base m-0">Pesanan Terbaru</h2><span className="text-[#827a73] text-xs">{orders.length} total</span></div>{recent.length ? <DataTable headers={['Kode','Meja','Item','Total','Status','Waktu']} rows={recent.map(o => [<b key="i">{o.orderCode}</b>, `Meja ${o.tableNumber}`, o.items.map(i => `${i.name} x${i.qty}`).join(', '), rupiah(o.total), <Badge key="s" status={o.status} />, fmtDate(o.createdAt || '')])} /> : <EmptyState title="Belum ada aktivitas" text="Pesanan dari pelanggan akan tampil di sini." />}</section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><h2 className="font-bold text-base m-0 mb-4">Info Restoran</h2><div className="text-sm text-[#827a73] space-y-1"><p>Total menu aktif: <b className="text-[#292522]">{products.filter(p => p.isActive).length}</b></p><p>Pesanan masuk: <b className="text-[#292522]">{orders.filter(o => o.status === 'received').length}</b></p><p>Sedang diproses: <b className="text-[#292522]">{orders.filter(o => o.status === 'preparing').length}</b></p><p>Siap disajikan: <b className="text-[#292522]">{orders.filter(o => o.status === 'ready').length}</b></p></div></section>
      </div>
      {showPF && <ProductForm categories={categories} onClose={() => setShowPF(false)} onSaved={m => { onToast(m); refresh(); }} />}
    </div>
  );
}

// ── ProductsPage ──────────────────────────────────────────────────────────────
function ProductsPage({ onToast }: { onToast: (m: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [catF, setCatF] = useState(''); const [statF, setStatF] = useState('');
  const [editItem, setEditItem] = useState<Product | undefined>(); const [showF, setShowF] = useState(false); const [delItem, setDelItem] = useState<Product | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [mData, cData] = await Promise.all([
        apiFetch<{ menuItems: Product[] }>('/api/menu'),
        apiFetch<{ categories: Category[] }>('/api/categories'),
      ]);
      setProducts(mData.menuItems || []);
      setCategories(cData.categories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const shown = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!catF || p.category === catF) &&
    (!statF || (statF === 'Tersedia' ? p.isActive : !p.isActive))
  );

  const handleDelete = async (item: Product) => {
    try {
      await apiFetch(`/api/menu/${item._id}`, { method: 'DELETE' });
      onToast('Menu berhasil dihapus');
      refresh();
    } catch (err: any) { alert(err.message || 'Gagal menghapus'); }
  };

  if (loading) return <div className="text-[#827a73] text-sm">Memuat menu...</div>;

  return (
    <div>
      <PageHeading title="Menu" desc="Kelola setiap menu yang tersedia." action={<button onClick={() => { setEditItem(undefined); setShowF(true); }} className={bPri}>+ Tambah Menu</button>} />
      <div className="flex flex-wrap gap-[9px] mb-[18px]">
        <input className={iCls + ' min-w-[210px]'} placeholder="Cari nama menu" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={iCls} value={catF} onChange={e => setCatF(e.target.value)}><option value="">Semua kategori</option>{categories.filter(c => c.slug !== 'semua').map(c => <option key={c._id} value={c.slug}>{c.name}</option>)}</select>
        <select className={iCls} value={statF} onChange={e => setStatF(e.target.value)}><option value="">Semua status</option><option value="Tersedia">Tersedia</option><option value="Nonaktif">Nonaktif</option></select>
      </div>
      {shown.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[15px]">{shown.map(item => <article key={item._id} className="bg-white border border-[#e9e3dc] rounded-[16px] overflow-hidden relative"><div className="h-[116px] bg-[#f3e5de] flex items-center justify-center text-[30px] text-[#aa2027] overflow-hidden">{item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" /> : '♨'}</div><div className="p-[14px]"><h3 className="text-[15px] font-bold m-0 mb-1">{item.name}</h3><p className="text-[#827a73] text-xs m-0 mb-3">{item.category || 'Tanpa kategori'}</p><div className="flex items-center justify-between pt-[11px] border-t border-[#e9e3dc]"><b className="text-sm">{rupiah(item.price)}</b><Badge status={item.isActive ? 'Tersedia' : 'Nonaktif'} /></div><div className="flex gap-1 mt-2"><SmallBtn onClick={() => { setEditItem(item); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelItem(item)}>Hapus</SmallBtn></div></div></article>)}</div> : <EmptyState title="Belum ada menu" text="Tambahkan menu pertama untuk mulai mengelola Selera Sambal." action={<button onClick={() => { setEditItem(undefined); setShowF(true); }} className={bPri}>+ Tambah Menu</button>} />}
      {showF && <ProductForm product={editItem} categories={categories} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}
      {delItem && <ConfirmModal message={`Hapus menu "${delItem.name}"?`} onConfirm={() => handleDelete(delItem)} onClose={() => setDelItem(null)} />}
    </div>
  );
}

// ── CategoriesPage ────────────────────────────────────────────────────────────
function CategoriesPage({ onToast }: { onToast: (m: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCat, setEditCat] = useState<Category | undefined>();
  const [showF, setShowF] = useState(false);
  const [delCat, setDelCat] = useState<Category | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cData, mData] = await Promise.all([
        apiFetch<{ categories: Category[] }>('/api/categories'),
        apiFetch<{ menuItems: Product[] }>('/api/menu'),
      ]);
      setCategories(cData.categories || []);
      setProducts(mData.menuItems || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (cat: Category) => {
    try {
      await apiFetch(`/api/categories/${cat._id}`, { method: 'DELETE' });
      onToast('Kategori berhasil dihapus');
      refresh();
    } catch (err: any) { alert(err.message || 'Gagal menghapus kategori'); }
  };

  if (loading) return <div className="text-[#827a73] text-sm">Memuat kategori...</div>;

  return (
    <div>
      <PageHeading title="Kategori" desc="Kelompokkan menu agar mudah dicari." action={<button onClick={() => { setEditCat(undefined); setShowF(true); }} className={bPri}>+ Tambah Kategori</button>} />
      {categories.length ? <DataTable headers={['Kategori', 'Slug', 'Jumlah Menu', 'Aksi']} rows={categories.map(c => [<b key="n">{c.name}</b>, <span key="s" className="text-[#827a73] text-xs font-mono">{c.slug}</span>, `${products.filter(p => p.category === c.slug).length} menu`, <div key="a" className="flex gap-1"><SmallBtn onClick={() => { setEditCat(c); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelCat(c)}>Hapus</SmallBtn></div>])} /> : <EmptyState title="Belum ada kategori" text="Buat kategori pertama untuk menata menu Anda." />}
      {showF && <CategoryForm category={editCat} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}
      {delCat && <ConfirmModal message={`Hapus kategori "${delCat.name}"?`} onConfirm={() => handleDelete(delCat)} onClose={() => setDelCat(null)} />}
    </div>
  );
}

// ── OrdersPage ────────────────────────────────────────────────────────────────
function OrdersPage({ onToast }: { onToast: (m: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [statF, setStatF] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: Order[] }>('/api/orders');
      setOrders(data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  // Auto-refresh every 10 seconds to catch new customer orders
  useEffect(() => { const t = setInterval(refresh, 10000); return () => clearInterval(t); }, [refresh]);

  const shown = orders.filter(o => `${o.orderCode}${o.tableNumber}`.toLowerCase().includes(search.toLowerCase()) && (!statF || o.status === statF));

  if (loading) return <div className="text-[#827a73] text-sm">Memuat pesanan...</div>;

  return (
    <div>
      <PageHeading title="Pesanan" desc="Pantau pesanan yang masuk dari pelanggan." />
      <div className="flex flex-wrap gap-[9px] mb-[18px]">
        <input className={iCls + ' min-w-[210px]'} placeholder="Cari kode atau meja" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={iCls} value={statF} onChange={e => setStatF(e.target.value)}><option value="">Semua status</option>{['received', 'preparing', 'ready', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      {shown.length ? <DataTable headers={['Kode', 'Meja', 'Item', 'Total', 'Status', 'Waktu', 'Aksi']} rows={shown.map(o => [<b key="i">{o.orderCode}</b>, `Meja ${o.tableNumber}`, o.items.map(i => `${i.name} x${i.qty}`).join(', '), rupiah(o.total), <Badge key="s" status={o.status} />, fmtDate(o.createdAt || ''), <SmallBtn key="d" onClick={() => setDetailOrder(o)}>Detail</SmallBtn>])} /> : <EmptyState title="Belum ada pesanan" text="Pesanan dari pelanggan akan muncul di sini secara otomatis." />}
      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} onSaved={m => { onToast(m); refresh(); }} />}
    </div>
  );
}

// ── AnalyticsPage ─────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ orders: Order[] }>('/api/orders').then(d => { setOrders(d.orders || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#827a73] text-sm">Memuat data...</div>;

  const revenue = orders.filter(o => o.status !== 'completed').reduce((s, o) => s + Number(o.total), 0);
  return (
    <div>
      <PageHeading title="Analitik" desc="Keputusan bisnis berdasarkan transaksi nyata." />
      {orders.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatCard icon="Rp" label="Total Revenue" value={rupiah(revenue)} /><StatCard icon="▤" label="Total Pesanan" value={orders.length} /><StatCard icon="+" label="Rata-rata Pesanan" value={orders.length ? rupiah(revenue / orders.length) : 'Rp 0'} /></div> : <EmptyState title="Belum cukup data" text="Pesanan pelanggan akan membentuk data analitik di sini." />}
    </div>
  );
}

// ── PromotionsPage ────────────────────────────────────────────────────────────
function PromotionsPage({ onToast }: { onToast: (m: string) => void }) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPromo, setEditPromo] = useState<Promotion | undefined>();
  const [showF, setShowF] = useState(false);
  const [delPromo, setDelPromo] = useState<Promotion | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Fetch ALL promos (including inactive) for admin view
      const res = await fetch('/api/promos');
      const data = await res.json();
      setPromos(data.promos || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (promo: Promotion) => {
    try {
      await apiFetch(`/api/promos/${promo._id}`, { method: 'DELETE' });
      onToast('Promo berhasil dihapus');
      refresh();
    } catch (err: any) { alert(err.message || 'Gagal menghapus promo'); }
  };

  if (loading) return <div className="text-[#827a73] text-sm">Memuat promo...</div>;

  return (
    <div>
      <PageHeading title="Promo" desc="Kelola penawaran restoran." action={<button onClick={() => { setEditPromo(undefined); setShowF(true); }} className={bPri}>+ Tambah Promo</button>} />
      {promos.length ? <DataTable headers={['Judul', 'Harga Asli', 'Harga Promo', 'Status', 'Aksi']} rows={promos.map(p => [<b key="n">{p.title}</b>, rupiah(p.originalPrice), rupiah(p.discountedPrice), <Badge key="s" status={p.isActive ? 'Aktif' : 'Nonaktif'} />, <div key="a" className="flex gap-1"><SmallBtn onClick={() => { setEditPromo(p); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelPromo(p)}>Hapus</SmallBtn></div>])} /> : <EmptyState title="Belum ada promo" text="Buat promo untuk menarik lebih banyak pesanan." />}
      {showF && <PromoForm promo={editPromo} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}
      {delPromo && <ConfirmModal message={`Hapus promo "${delPromo.title}"?`} onConfirm={() => handleDelete(delPromo)} onClose={() => setDelPromo(null)} />}
    </div>
  );
}

// ── InventoryPage ─────────────────────────────────────────────────────────────
function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ menuItems: Product[] }>('/api/menu').then(d => { setProducts(d.menuItems || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#827a73] text-sm">Memuat inventori...</div>;

  return (
    <div>
      <PageHeading title="Inventori" desc="Status ketersediaan menu dari database." />
      {products.length ? <DataTable headers={['Menu', 'Kategori', 'Harga', 'Status']} rows={products.map(p => [<b key="n">{p.name}</b>, p.category || '—', rupiah(p.price), <Badge key="s" status={p.isActive ? 'Tersedia' : 'Nonaktif'} />])} /> : <EmptyState title="Belum ada inventori" text="Stok menu akan tampil saat menu ditambahkan." />}
    </div>
  );
}

// ── NotificationsPage (local-only, no DB needed) ──────────────────────────────
function NotificationsPage({ onToast }: { onToast: (m: string) => void }) {
  const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1);
  const items = ssGet<Notification[]>('notifications'); const rev = [...items].reverse();
  return <div key={tick}><PageHeading title="Notifikasi" desc="Tetap tahu setiap perubahan penting." action={items.length ? <button onClick={() => { ssSet('notifications', items.map(n => ({ ...n, read: true }))); onToast('Semua notifikasi sudah dibaca'); refresh(); }} className={bSec}>Tandai semua dibaca</button> : undefined} />{rev.length ? <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><div className="flex flex-col gap-3">{rev.map(n => <div key={n.id} className="flex items-center gap-3 pb-3 border-b border-[#e9e3dc] last:border-0 last:pb-0"><span className="w-[34px] h-[34px] bg-[#fff0df] rounded-[8px] grid place-items-center text-[#bb7420] shrink-0">◌</span><div className="flex-1"><b className="block text-sm">{n.text}</b><small className="text-[#827a73] text-xs">{fmtDate(n.createdAt)}</small></div><Badge status={n.read ? 'Dibaca' : 'Baru'} /><button onClick={() => { ssSet('notifications', items.filter(i => i.id !== n.id)); refresh(); }} className="text-[#827a73] text-lg hover:text-[#aa2027] px-1">x</button></div>)}</div></section> : <EmptyState title="Belum ada notifikasi" text="Pemberitahuan operasional akan tampil di sini." />}</div>;
}

// ── SettingsPage (wired to /api/settings) ────────────────────────────────────
function SettingsPage({ onToast }: { onToast: (m: string) => void }) {
  const [settings, setSettings] = useState<AppSettings>(ssGet<AppSettings>('settings'));
  const [admin, setAdmin] = useState<AdminUser>(ssGet<AdminUser>('admin'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>('/api/settings')
      .then(d => { if (d.settings) setSettings(d.settings); })
      .catch(err => console.error('Gagal memuat settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const setRI = (k: string, v: string) =>
    setSettings(s => ({ ...s, restaurantInfo: { ...s.restaurantInfo, [k]: v } }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
      ssSet('admin', admin);
      onToast('Pengaturan berhasil disimpan ke database');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-[#827a73] text-sm">Memuat pengaturan...</div>;

  return (
    <div>
      <PageHeading title="Pengaturan" desc="Informasi restoran dan tarif tersimpan di database." />
      <form onSubmit={submit}>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Profil Restoran</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Nama Restoran<input className={iCls} value={settings.restaurantInfo?.name || ''} onChange={e => setRI('name', e.target.value)} /></label>
            <label className="grid text-xs font-bold gap-[6px]">WhatsApp<input className={iCls} value={settings.restaurantInfo?.whatsapp || ''} onChange={e => setRI('whatsapp', e.target.value)} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Email<input className={iCls} value={settings.restaurantInfo?.email || ''} onChange={e => setRI('email', e.target.value)} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Instagram<input className={iCls} value={settings.restaurantInfo?.instagram || ''} onChange={e => setRI('instagram', e.target.value)} /></label>
            <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Alamat<textarea className={`${iCls} min-h-[80px] resize-y`} value={settings.restaurantInfo?.address || ''} onChange={e => setRI('address', e.target.value)} /></label>
          </div>
        </section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Tarif Pajak & Layanan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Pajak Restoran / PB1 (%)<input type="number" min="0" max="100" className={iCls} value={settings.taxRatePercent} onChange={e => setSettings(s => ({ ...s, taxRatePercent: Number(e.target.value) }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Service Charge (%)<input type="number" min="0" max="100" className={iCls} value={settings.serviceChargeRatePercent} onChange={e => setSettings(s => ({ ...s, serviceChargeRatePercent: Number(e.target.value) }))} /></label>
          </div>
          <p className="text-[#827a73] text-xs mt-3">Perubahan tarif ini otomatis berlaku di halaman keranjang dan checkout pelanggan.</p>
        </section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Profil Admin (Lokal)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Nama Admin<input className={iCls} value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Username<input className={iCls} value={admin.username} onChange={e => setAdmin(a => ({ ...a, username: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Password Lokal<input type="password" className={iCls} value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} /></label>
          </div>
        </section>
        <div className="flex flex-wrap gap-[9px] justify-end">
          <button type="submit" className={bPri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
        </div>
      </form>
    </div>
  );
}

// ── LoginPage (local only, unchanged) ─────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [showPw, setShowPw] = useState(false); const [remember, setRemember] = useState(false); const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); const admin = ssGet<AdminUser>('admin'); if (username === admin.username && password === admin.password) { sessionStorage.setItem('ss_session', '1'); if (remember) localStorage.setItem('ss_remember', '1'); onLogin(); } else { setError('Username atau password tidak sesuai.'); } };
  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2" style={{ background: '#f3ede7', fontFamily: "'DM Sans',sans-serif" }}>
      <section className="hidden md:flex flex-col justify-center relative overflow-hidden" style={{ background: '#8f1d24', color: '#fff', padding: 'clamp(40px,9vw,130px)' }}>
        <div className="absolute bottom-[-90px] right-[-80px] w-[260px] h-[260px] rounded-full border-[80px] border-white/20 pointer-events-none" />
        <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[21px] font-bold mb-8 shrink-0" style={{ background: '#f5b264', color: '#fff', fontFamily: 'Playfair Display,serif' }}>SS</div>
        <p className="text-[11px] font-bold tracking-[0.1em] mb-4" style={{ color: '#f5b264' }}>ADMIN RESTORAN</p>
        <h1 className="font-bold m-0 leading-[0.94] tracking-[-0.06em]" style={{ fontFamily: 'Playfair Display,serif', fontSize: 'clamp(50px,6vw,82px)' }}>Selera<br />Sambal.</h1>
        <p className="text-sm mt-6 leading-[1.7] max-w-[370px]" style={{ color: '#f5d9ca' }}>Ruang kerja sederhana untuk mengelola setiap rasa, pesanan, dan pelanggan.</p>
        <div className="mt-[34px] pt-4 border-t text-sm" style={{ borderColor: '#ffffff40', color: '#f5d9ca' }}>Pedasnya terukur, operasionalnya teratur.</div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="bg-white rounded-[18px] w-full max-w-[430px] p-[38px] shadow-xl">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#827a73] mb-1">SELAMAT DATANG</p>
          <h2 className="text-[29px] font-bold tracking-[-0.04em] m-0 text-[#292522]">Masuk ke dashboard</h2>
          <p className="text-[#827a73] text-sm mt-2 mb-6">Gunakan akun lokal Anda untuk melanjutkan.</p>
          <form onSubmit={submit} className="grid gap-[17px]">
            <label className="grid text-xs font-bold gap-[6px] text-[#292522]">Username<input className={iCls} required value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" /></label>
            <label className="grid text-xs font-bold gap-[6px] text-[#292522]">Password<div className="relative"><input className={`${iCls} pr-10`} type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="........" autoComplete="current-password" /><button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-[2px] top-[1px] px-2 py-2 text-[#827a73] hover:text-[#aa2027]">o</button></div></label>
            <label className="flex items-center gap-2 font-normal text-sm cursor-pointer"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Ingat sesi saya di perangkat ini</label>
            {error && <p className="text-xs text-[#c34040] font-medium">{error}</p>}
            <button type="submit" className={`${bPri} w-full py-3 mt-1 justify-center`}>Masuk ke Dashboard</button>
          </form>
          <p className="text-xs text-[#827a73] mt-5">Akun awal: <b>admin</b> · password: <b>admin123</b></p>
          <p className="text-xs text-[#827a73] mt-2">Ini adalah login lokal untuk demo, bukan sistem keamanan produksi.</p>
        </div>
      </section>
    </main>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV: { key: ActivePage; icon: string; label: string; group: string }[] = [
  { key: 'dashboard', icon: '▦', label: 'Dashboard', group: 'UTAMA' },
  { key: 'products', icon: '▣', label: 'Menu', group: 'MANAJEMEN' },
  { key: 'categories', icon: '◫', label: 'Kategori', group: 'MANAJEMEN' },
  { key: 'orders', icon: '◉', label: 'Pesanan', group: 'MANAJEMEN' },
  { key: 'analytics', icon: '⌁', label: 'Analitik', group: 'BISNIS' },
  { key: 'promotions', icon: '✦', label: 'Promo', group: 'BISNIS' },
  { key: 'inventory', icon: '▤', label: 'Inventori', group: 'BISNIS' },
  { key: 'notifications', icon: '◌', label: 'Notifikasi', group: 'ENGAGEMENT' },
  { key: 'settings', icon: '⚙', label: 'Pengaturan', group: 'SISTEM' },
];
const PAGE_LABELS: Record<ActivePage, [string, string]> = {
  dashboard: ['Dashboard', 'Overview'], products: ['Menu', 'Kelola hidangan'],
  categories: ['Kategori', 'Kelompokkan menu'], orders: ['Pesanan', 'Pantau pesanan masuk'],
  customers: ['Pelanggan', 'Riwayat pelanggan'], analytics: ['Analitik', 'Ringkasan bisnis'],
  promotions: ['Promo', 'Penawaran restoran'], inventory: ['Inventori', 'Ketersediaan menu'],
  reviews: ['Ulasan', 'Suara pelanggan'], notifications: ['Notifikasi', 'Pusat pemberitahuan'],
  settings: ['Pengaturan', 'Restoran dan sistem'],
};

// ── Root AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [page, setPage] = useState<ActivePage>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('ss_session') || localStorage.getItem('ss_remember')) setIsAuth(true);
    }
  }, []);

  const addToast = useCallback((msg: string) => {
    ssNotify(msg);
    const id = ssId('t');
    setToasts(t => [...t, { id, msg }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);
  const logout = () => { sessionStorage.removeItem('ss_session'); localStorage.removeItem('ss_remember'); setIsAuth(false); setPage('dashboard'); };

  if (!mounted) return null;
  if (!isAuth) return <LoginPage onLogin={() => setIsAuth(true)} />;

  const notifications = ssGet<Notification[]>('notifications');
  const unread = notifications.filter(n => !n.read).length;
  const admin = ssGet<AdminUser>('admin');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onToast={addToast} />;
      case 'products': return <ProductsPage onToast={addToast} />;
      case 'categories': return <CategoriesPage onToast={addToast} />;
      case 'orders': return <OrdersPage onToast={addToast} />;
      case 'analytics': return <AnalyticsPage />;
      case 'promotions': return <PromotionsPage onToast={addToast} />;
      case 'inventory': return <InventoryPage />;
      case 'notifications': return <NotificationsPage onToast={addToast} />;
      case 'settings': return <SettingsPage onToast={addToast} />;
      default: return <DashboardPage onToast={addToast} />;
    }
  };

  let lastGroup = '';
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        .ss-admin, .ss-admin * { box-sizing: border-box; }
        .ss-admin { font-family: 'DM Sans', sans-serif; }
        @keyframes ss-rise { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:none; } }
        .ss-rise { animation: ss-rise .25s ease; }
        .ss-page { animation: ss-rise .3s ease; }
        @media print { .no-print { display:none !important; } }
      `}</style>
      <div className="ss-admin flex min-h-screen bg-[#f8f6f2] text-[#292522]">
        <aside className={`no-print bg-[#251f1e] text-[#f7f1eb] flex flex-col z-[50] overflow-y-auto shrink-0 transition-all duration-200 fixed md:relative h-screen top-0 left-0 ${collapsed ? 'w-[72px]' : 'w-[250px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ padding: '26px 14px' }}>
          <a href="#" onClick={e => { e.preventDefault(); setPage('dashboard'); setMobileOpen(false); }} className={`flex items-center gap-[10px] font-bold text-[16px] pb-[25px] text-[#f7f1eb] no-underline ${collapsed ? 'justify-center' : 'px-[10px]'}`}>
            <b className="w-[33px] h-[33px] rounded-[12px] bg-[#aa2027] flex items-center justify-center shrink-0 text-white" style={{ fontFamily: 'Playfair Display,serif' }}>SS</b>
            {!collapsed && <span>Selera Sambal</span>}
          </a>
          <nav className="flex flex-col flex-1">
            {NAV.map(({ key, icon, label, group }) => {
              const showG = group !== lastGroup; lastGroup = group;
              return (
                <React.Fragment key={key}>
                  {showG && !collapsed && <p className="text-[10px] font-bold tracking-[0.1em] text-[#8d8581] mx-[10px] mt-[21px] mb-[7px]">{group}</p>}
                  {showG && collapsed && <div className="h-2" />}
                  <button onClick={() => { setPage(key); setMobileOpen(false); }} className={`flex items-center gap-[11px] rounded-[10px] px-[10px] py-[10px] text-sm transition-colors w-full text-left ${page === key ? 'bg-[#3a302e] text-white' : 'text-[#cfc7c1] hover:bg-[#3a302e] hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
                    <span className="text-[16px] w-[18px] text-center shrink-0">{icon}</span>
                    {!collapsed && <span>{label}{key === 'notifications' && unread > 0 ? ` (${unread})` : ''}</span>}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
          <div className="border-t border-[#423936] pt-3 mt-auto">
            <div className={`flex items-center gap-[11px] px-[10px] py-[10px] text-[#cfc7c1] text-sm ${collapsed ? 'justify-center' : ''}`}><span className="w-[18px] text-center shrink-0">●</span>{!collapsed && <span>{admin.name || 'Admin'}</span>}</div>
            <button onClick={logout} className={`flex items-center gap-[11px] rounded-[10px] px-[10px] py-[10px] text-[#cfc7c1] hover:bg-[#3a302e] hover:text-white text-sm w-full transition-colors ${collapsed ? 'justify-center' : ''}`}><span className="text-[16px] w-[18px] text-center shrink-0">↪</span>{!collapsed && <span>Keluar</span>}</button>
          </div>
        </aside>
        {mobileOpen && <div className="fixed inset-0 z-[49] bg-black/40 md:hidden no-print" onClick={() => setMobileOpen(false)} />}
        <main className="flex-1 min-w-0 flex flex-col" style={{ marginLeft: 0 }}>
          <header className="no-print sticky top-0 z-[4] bg-white/90 backdrop-blur border-b border-[#e9e3dc] h-[70px] flex items-center justify-between gap-4 px-[clamp(18px,3vw,38px)]">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (typeof window !== 'undefined' && window.innerWidth <= 768) setMobileOpen(s => !s); else setCollapsed(s => !s); }} className="p-2 rounded-[9px] hover:bg-[#f3eeea] text-[18px]">☰</button>
              <div className="hidden md:block text-sm text-[#827a73]"><b className="text-[#292522] text-base">{PAGE_LABELS[page]?.[0]}</b> / {PAGE_LABELS[page]?.[1]}</div>
            </div>
            <div className="flex items-center gap-[10px]">
              <input className="bg-[#f7f4f0] border border-transparent rounded-[9px] px-3 py-[9px] text-sm w-[160px] md:w-[220px] focus:bg-white focus:border-[#aa2027] outline-none" placeholder="Cari menu, order..." />
              <button onClick={() => setPage('notifications')} className="p-2 rounded-[9px] hover:bg-[#f3eeea] text-[17px] relative">◌{unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#aa2027] rounded-full border border-white"></span>}</button>
              <span className="w-[34px] h-[34px] rounded-full bg-[#f5d8cc] text-[#76131a] font-bold grid place-items-center text-sm shrink-0">{(admin.name || 'A')[0]}</span>
              <button onClick={() => setPage('products')} className="hidden md:inline-flex items-center gap-2 font-bold px-[14px] py-[10px] rounded-[9px] bg-[#aa2027] hover:bg-[#76131a] text-white text-sm">+ Tambah</button>
            </div>
          </header>
          <div key={page} className="ss-page p-[clamp(22px,3vw,38px)] flex-1">{renderPage()}</div>
          <footer className="no-print p-4 border-t border-[#e9e3dc] bg-white text-center">
            <Link href="/" className="text-xs text-[#827a73] hover:text-[#aa2027] underline transition-colors">← Kembali ke Selera Sambal</Link>
          </footer>
        </main>
      </div>
      <div className="fixed bottom-5 right-5 z-[30] flex flex-col gap-2 no-print">
        {toasts.map(t => <Toast key={t.id} message={t.msg} onRemove={() => removeToast(t.id)} />)}
      </div>
    </>
  );
}