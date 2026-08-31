'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ActivePage =
  | 'dashboard' | 'products' | 'categories' | 'orders' | 'customers'
  | 'analytics' | 'promotions' | 'inventory' | 'reviews' | 'notifications' | 'settings';

interface Product { id: string; name: string; category: string; price: number; stock: number; status: string; label: string; image: string; description: string; createdAt: string; }
interface Category { id: string; name: string; description: string; createdAt: string; }
interface OrderItem { productId: string; name: string; price: number; qty: number; }
interface Order { id: string; customer: string; phone: string; items: OrderItem[]; total: number; payment: string; status: string; createdAt: string; }
interface Customer { id: string; name: string; phone: string; createdAt: string; }
interface Promotion { id: string; name: string; code: string; kind: string; value: number; minimum: number; status: string; createdAt: string; }
interface Review { id: string; customer: string; menu: string; rating: number; comment: string; status: string; createdAt: string; }
interface Notification { id: string; text: string; read: boolean; createdAt: string; }
interface Restaurant { name: string; description: string; phone: string; email: string; address: string; hours: string; instagram: string; whatsapp: string; logo: string; }
interface AppSettings { primary: string; secondary: string; dark: boolean; orderPrefix: string; minimumOrder: number; tax: number; service: number; stockThreshold: number; currency: string; timezone: string; dateFormat: string; }
interface AdminUser { name: string; username: string; password: string; avatar: string; }

const SS_PREFIX = 'ss_admin_';
const DEFAULTS = {
  restaurant: { name: 'Selera Sambal', description: '', phone: '', email: '', address: '', hours: '', instagram: '', whatsapp: '', logo: '' } as Restaurant,
  settings: { primary: '#aa2027', secondary: '#e47d3e', dark: false, orderPrefix: 'SS', minimumOrder: 0, tax: 0, service: 0, stockThreshold: 5, currency: 'IDR', timezone: 'Asia/Jakarta', dateFormat: 'id-ID' } as AppSettings,
  admin: { name: 'Admin Selera', username: 'admin', password: 'admin123', avatar: '' } as AdminUser,
};
function ssGet<T>(key: string): T { try { return JSON.parse(localStorage.getItem(SS_PREFIX + key) ?? 'null') ?? (DEFAULTS as any)[key] ?? []; } catch { return (DEFAULTS as any)[key] ?? [] as any; } }
function ssSet<T>(key: string, value: T): T { localStorage.setItem(SS_PREFIX + key, JSON.stringify(value)); return value; }
function ssId(prefix = 'ID') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
function ssReset() { ['restaurant','products','categories','orders','customers','promotions','reviews','notifications','settings','admin'].forEach(k => localStorage.removeItem(SS_PREFIX + k)); }
function ssBackup() { const keys = ['restaurant','products','categories','orders','customers','promotions','reviews','notifications','settings','admin']; const obj: any = {}; keys.forEach(k => { obj[k] = ssGet(k); }); return JSON.stringify(obj, null, 2); }
function ssRestore(data: any) { ['restaurant','products','categories','orders','customers','promotions','reviews','notifications','settings','admin'].forEach(k => { if (data[k] !== undefined) ssSet(k, data[k]); }); }
function ssNotify(text: string) { ssSet('notifications', [...ssGet<Notification[]>('notifications'), { id: ssId('NOT'), text, read: false, createdAt: new Date().toISOString() }]); }
function rupiah(v: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v) || 0); }
function fmtDate(v: string) { return v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—'; }
function Badge({ status }: { status: string }) {
  const cls = /tersedia|aktif|aman|selesai|dibaca/i.test(status) ? 'bg-[#e8f5ee] text-[#25805b]' : /baru|diproses|siap|menipis/i.test(status) ? 'bg-[#fff0df] text-[#bb7420]' : /habis|nonaktif|dibatalkan/i.test(status) ? 'bg-[#fbe7e7] text-[#c34040]' : 'bg-[#f0edeb] text-[#625a56]';
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
function ProductForm({ productId, onClose, onSaved }: { productId?: string; onClose: () => void; onSaved: (m: string) => void }) {
  const products = ssGet<Product[]>('products'); const categories = ssGet<Category[]>('categories');
  const cur = products.find(p => p.id === productId) || {} as Product;
  const [f, sf] = useState({ name: cur.name || '', category: cur.category || '', price: cur.price ?? '', stock: cur.stock ?? '', status: cur.status || 'Tersedia', label: cur.label || '', image: cur.image || '', description: cur.description || '' });
  const set = (k: string, v: any) => sf(x => ({ ...x, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const up: Product = { ...cur, ...f, id: cur.id || ssId('MENU'), price: Number(f.price), stock: Number(f.stock), createdAt: cur.createdAt || new Date().toISOString() };
    ssSet('products', cur.id ? products.map(p => p.id === cur.id ? up : p) : [...products, up]);
    onSaved(cur.id ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan'); onClose();
  };
  return (
    <Modal title={productId ? 'Edit Menu' : 'Tambah Menu'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <label className="grid text-xs font-bold gap-[6px]">Nama Menu<input className={iCls} required value={f.name} onChange={e => set('name', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Kategori<select className={iCls} value={f.category} onChange={e => set('category', e.target.value)}><option value="">Pilih kategori</option>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Harga<input className={iCls} type="number" min="0" required value={f.price} onChange={e => set('price', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Stok<input className={iCls} type="number" min="0" required value={f.stock} onChange={e => set('stock', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.status} onChange={e => set('status', e.target.value)}>{['Tersedia','Habis','Nonaktif'].map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Label<select className={iCls} value={f.label} onChange={e => set('label', e.target.value)}><option value="">Tanpa label</option>{['Best Seller','Baru','Pedas','Favorit','Promo'].map(l => <option key={l}>{l}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Foto URL<input className={iCls} value={f.image} onChange={e => set('image', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Deskripsi<textarea className={`${iCls} min-h-[80px] resize-y`} value={f.description} onChange={e => set('description', e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri}>Simpan Menu</button></div>
      </form>
    </Modal>
  );
}

function OrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: (m: string) => void }) {
  const prods = ssGet<Product[]>('products').filter(p => p.status === 'Tersedia');
  const settings = ssGet<AppSettings>('settings');
  const [f, sf] = useState({ customer: '', phone: '', productId: prods[0]?.id || '', qty: '1', payment: 'Tunai', status: 'Baru' });
  const set = (k: string, v: string) => sf(x => ({ ...x, [k]: v }));
  if (!prods.length) return <Modal title="Tambah Pesanan" onClose={onClose}><p className="text-[#827a73] text-sm">Tambahkan menu dengan status <b>Tersedia</b> terlebih dahulu.</p><div className="flex justify-end mt-4"><button onClick={onClose} className={bSec}>Tutup</button></div></Modal>;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = prods.find(p => p.id === f.productId)!;
    const item = { productId: prod.id, name: prod.name, price: prod.price, qty: Number(f.qty) };
    const order: Order = { id: `${settings.orderPrefix || 'SS'}-${String(Date.now()).slice(-6)}`, customer: f.customer, phone: f.phone, items: [item], total: item.price * item.qty, payment: f.payment, status: f.status, createdAt: new Date().toISOString() };
    ssSet('orders', [...ssGet<Order[]>('orders'), order]);
    const custs = ssGet<Customer[]>('customers');
    if (!custs.some(c => c.name === f.customer)) ssSet('customers', [...custs, { id: ssId('CUST'), name: f.customer, phone: f.phone, createdAt: order.createdAt }]);
    onSaved('Pesanan berhasil disimpan'); onClose();
  };
  return (
    <Modal title="Tambah Pesanan" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <label className="grid text-xs font-bold gap-[6px]">Nama Pelanggan<input className={iCls} required value={f.customer} onChange={e => set('customer', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Nomor Kontak<input className={iCls} value={f.phone} onChange={e => set('phone', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Menu<select className={iCls} value={f.productId} onChange={e => set('productId', e.target.value)}>{prods.map(p => <option key={p.id} value={p.id}>{p.name} — {rupiah(p.price)}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Jumlah<input className={iCls} type="number" min="1" value={f.qty} onChange={e => set('qty', e.target.value)} /></label>
          <label className="grid text-xs font-bold gap-[6px]">Pembayaran<select className={iCls} value={f.payment} onChange={e => set('payment', e.target.value)}>{['Tunai','QRIS','Transfer'].map(p => <option key={p}>{p}</option>)}</select></label>
          <label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.status} onChange={e => set('status', e.target.value)}>{['Baru','Diproses','Siap','Selesai','Dibatalkan'].map(s => <option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri}>Simpan Pesanan</button></div>
      </form>
    </Modal>
  );
}

function OrderDetailModal({ orderId, onClose, onSaved }: { orderId: string; onClose: () => void; onSaved: (m: string) => void }) {
  const orders = ssGet<Order[]>('orders'); const order = orders.find(o => o.id === orderId)!;
  const [status, setStatus] = useState(order.status); const [showDel, setShowDel] = useState(false);
  return (
    <>{' '}
      <Modal title={`Order ${order.id}`} onClose={onClose}>
        <h2 className="font-bold text-center mb-1">SELERA SAMBAL</h2>
        <p className="text-[#827a73] text-xs text-center mb-3">{fmtDate(order.createdAt)} · {order.customer}</p>
        <hr className="border-[#e9e3dc] mb-3" />
        {order.items.map((item, i) => <div key={i} className="flex justify-between text-sm mb-2"><span>{item.name} × {item.qty}</span><b>{rupiah(item.price * item.qty)}</b></div>)}
        <hr className="border-[#e9e3dc] my-3" />
        <div className="flex justify-between text-sm font-bold mb-4"><b>Total</b><b>{rupiah(order.total)}</b></div>
        <label className="grid text-xs font-bold gap-[6px] mb-4">Status Pesanan<select className={iCls} value={status} onChange={e => setStatus(e.target.value)}>{['Baru','Diproses','Siap','Selesai','Dibatalkan'].map(s => <option key={s}>{s}</option>)}</select></label>
        <div className="flex justify-end gap-[9px]">
          <button onClick={() => setShowDel(true)} className="inline-flex items-center gap-2 font-bold px-4 py-[10px] rounded-[9px] bg-[#fdecec] text-[#c34040] text-sm hover:bg-[#fbd6d6]">Hapus</button>
          <button onClick={() => window.print()} className={bSec}>Cetak Invoice</button>
          <button onClick={() => { ssSet('orders', orders.map(o => o.id === orderId ? { ...o, status } : o)); onSaved('Status pesanan diperbarui'); onClose(); }} className={bPri}>Simpan Status</button>
        </div>
      </Modal>
      {showDel && <ConfirmModal message="Hapus pesanan ini?" onConfirm={() => { ssSet('orders', orders.filter(o => o.id !== orderId)); onSaved('Pesanan berhasil dihapus'); onClose(); }} onClose={() => setShowDel(false)} />}
    </>
  );
}

function SimpleForm({ type, id, onClose, onSaved }: { type: 'categories' | 'promotions' | 'reviews'; id?: string; onClose: () => void; onSaved: (m: string) => void }) {
  const entries = ssGet<any[]>(type); const cur = entries.find(e => e.id === id) || {};
  const [f, sf] = useState<any>({ ...cur }); const set = (k: string, v: any) => sf((x: any) => ({ ...x, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = { ...cur, ...f, id: cur.id || ssId(type.toUpperCase()), createdAt: cur.createdAt || new Date().toISOString() };
    ['value','minimum','rating'].forEach(k => { if (k in entry) entry[k] = Number(entry[k]); });
    ssSet(type, cur.id ? entries.map((item: any) => item.id === cur.id ? entry : item) : [...entries, entry]);
    onSaved('Data berhasil disimpan'); onClose();
  };
  const labels: Record<string, string> = { categories: 'Kategori', promotions: 'Promo', reviews: 'Ulasan' };
  return (
    <Modal title={id ? `Edit ${labels[type]}` : `Tambah ${labels[type]}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          {type === 'categories' && <><label className="grid text-xs font-bold gap-[6px]">Nama Kategori<input className={iCls} required value={f.name||''} onChange={e=>set('name',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Deskripsi<input className={iCls} value={f.description||''} onChange={e=>set('description',e.target.value)} /></label></>}
          {type === 'promotions' && <><label className="grid text-xs font-bold gap-[6px]">Nama Promo<input className={iCls} required value={f.name||''} onChange={e=>set('name',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Kode Promo<input className={iCls} required value={f.code||''} onChange={e=>set('code',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Jenis Diskon<select className={iCls} value={f.kind||'Persentase'} onChange={e=>set('kind',e.target.value)}><option>Persentase</option><option>Nominal</option></select></label><label className="grid text-xs font-bold gap-[6px]">Nilai<input className={iCls} type="number" value={f.value??''} onChange={e=>set('value',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Min. Pembelian<input className={iCls} type="number" value={f.minimum??''} onChange={e=>set('minimum',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.status||'Aktif'} onChange={e=>set('status',e.target.value)}><option>Aktif</option><option>Nonaktif</option></select></label></>}
          {type === 'reviews' && <><label className="grid text-xs font-bold gap-[6px]">Pelanggan<input className={iCls} required value={f.customer||''} onChange={e=>set('customer',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Menu<input className={iCls} value={f.menu||''} onChange={e=>set('menu',e.target.value)} /></label><label className="grid text-xs font-bold gap-[6px]">Rating<select className={iCls} value={f.rating||5} onChange={e=>set('rating',e.target.value)}>{[1,2,3,4,5].map(r=><option key={r}>{r}</option>)}</select></label><label className="grid text-xs font-bold gap-[6px]">Status<select className={iCls} value={f.status||'Belum dibaca'} onChange={e=>set('status',e.target.value)}><option>Belum dibaca</option><option>Dibaca</option></select></label><label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Komentar<textarea className={`${iCls} min-h-[80px] resize-y`} value={f.comment||''} onChange={e=>set('comment',e.target.value)} /></label></>}
        </div>
        <div className="flex justify-end gap-[9px] mt-[22px]"><button type="button" onClick={onClose} className={bSec}>Batal</button><button type="submit" className={bPri}>Simpan</button></div>
      </form>
    </Modal>
  );
}
function DashboardPage({ onToast }: { onToast: (m: string) => void }) {
  const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1);
  const products = ssGet<Product[]>('products'); const orders = ssGet<Order[]>('orders');
  const reviews = ssGet<Review[]>('reviews'); const { stockThreshold } = ssGet<AppSettings>('settings');
  const threshold = Number(stockThreshold);
  const active = orders.filter(o => o.status !== 'Dibatalkan');
  const revenue = active.reduce((s, o) => s + Number(o.total), 0);
  const sold = active.reduce((s, o) => s + o.items.reduce((c, i) => c + Number(i.qty), 0), 0);
  const warnings = products.filter(p => Number(p.stock) <= threshold);
  const recent = [...orders].reverse().slice(0, 5);
  const [showPF, setShowPF] = useState(false); const [showOF, setShowOF] = useState(false);
  return (
    <div key={tick}>
      <PageHeading title="Selamat datang, Admin" desc="Ringkasan operasional Selera Sambal hari ini." action={<button onClick={() => setShowPF(true)} className={bPri}>+ Tambah Menu</button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5"><StatCard icon="▣" label="Total Menu" value={products.length} /><StatCard icon="◉" label="Menu Terjual" value={sold} /><StatCard icon="Rp" label="Pendapatan" value={rupiah(revenue)} /><StatCard icon="▤" label="Pesanan" value={orders.length} /></div>
      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-[18px] mb-5">
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-base m-0">Penjualan</h2><span className="text-[#827a73] text-xs">7 Hari</span></div><div className="h-[220px] flex items-center justify-center text-[#827a73] text-sm">{orders.length ? 'Grafik memperbarui dari data pesanan.' : 'Belum ada data penjualan'}</div></section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><h2 className="font-bold text-base m-0 mb-4">Peringatan Stok</h2><div className="flex flex-col gap-3">{warnings.length ? warnings.map(p => <div key={p.id} className="flex items-center gap-3 pb-3 border-b border-[#e9e3dc] last:border-0 last:pb-0"><span className="w-[34px] h-[34px] bg-[#fff0df] rounded-[8px] grid place-items-center font-bold text-sm shrink-0">!</span><div className="flex-1 text-sm"><b className="block">{p.name}</b><small className="text-[#827a73]">{p.stock ? `Stok tersisa ${p.stock}` : 'Stok habis'}</small></div><Badge status={p.stock ? 'Menipis' : 'Habis'} /></div>) : <EmptyState title="Tidak ada peringatan." text="Semua stok dalam kondisi aman." />}</div></section>
      </div>
      <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5"><h2 className="font-bold text-base m-0 mb-4">Pesanan Terbaru</h2>{recent.length ? <DataTable headers={['Order ID','Pelanggan','Item','Total','Status','Waktu']} rows={recent.map(o => [<b key="i">{o.id}</b>, o.customer, o.items.map(i => `${i.name} x${i.qty}`).join(', '), rupiah(o.total), <Badge key="s" status={o.status} />, fmtDate(o.createdAt)])} /> : <EmptyState title="Belum ada aktivitas" text="Pesanan yang masuk akan tampil di sini." action={<button onClick={() => setShowOF(true)} className={bPri}>+ Tambah Pesanan</button>} />}</section>
      <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><h2 className="font-bold text-base m-0 mb-4">Rating Restoran</h2>{reviews.length ? <strong className="text-[30px] font-bold">{(reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)} &#9733;</strong> : <EmptyState title="Belum ada ulasan." text="Ulasan pelanggan akan muncul di sini." />}</section>
      {showPF && <ProductForm onClose={() => setShowPF(false)} onSaved={m => { onToast(m); refresh(); }} />}
      {showOF && <OrderForm onClose={() => setShowOF(false)} onSaved={m => { onToast(m); refresh(); }} />}
    </div>
  );
}

function ProductsPage({ onToast }: { onToast: (m: string) => void }) {
  const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1);
  const [search, setSearch] = useState(''); const [catF, setCatF] = useState(''); const [statF, setStatF] = useState('');
  const [editId, setEditId] = useState<string | undefined>(); const [showF, setShowF] = useState(false); const [delId, setDelId] = useState<string | null>(null);
  const products = ssGet<Product[]>('products'); const categories = ssGet<Category[]>('categories');
  const shown = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (!catF || p.category === catF) && (!statF || p.status === statF));
  return (
    <div key={tick}>
      <PageHeading title="Menu" desc="Kelola setiap menu yang tersedia." action={<button onClick={() => { setEditId(undefined); setShowF(true); }} className={bPri}>+ Tambah Menu</button>} />
      <div className="flex flex-wrap gap-[9px] mb-[18px]">
        <input className={iCls + ' min-w-[210px]'} placeholder="Cari nama menu" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={iCls} value={catF} onChange={e => setCatF(e.target.value)}><option value="">Semua kategori</option>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select>
        <select className={iCls} value={statF} onChange={e => setStatF(e.target.value)}><option value="">Semua status</option>{['Tersedia','Habis','Nonaktif'].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      {shown.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[15px]">{shown.map(item => <article key={item.id} className="bg-white border border-[#e9e3dc] rounded-[16px] overflow-hidden relative"><div className="h-[116px] bg-[#f3e5de] flex items-center justify-center text-[30px] text-[#aa2027] overflow-hidden">{item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : '♨'}</div>{item.label && <span className="absolute top-[10px] left-[10px] bg-[#fff0df] text-[#bb7420] text-[11px] font-bold px-[9px] py-[5px] rounded-full">{item.label}</span>}<div className="p-[14px]"><h3 className="text-[15px] font-bold m-0 mb-1">{item.name}</h3><p className="text-[#827a73] text-xs m-0 mb-3">{item.category || 'Tanpa kategori'} · Stok {item.stock}</p><div className="flex items-center justify-between pt-[11px] border-t border-[#e9e3dc]"><b className="text-sm">{rupiah(item.price)}</b><Badge status={item.status} /></div><div className="flex gap-1 mt-2"><SmallBtn onClick={() => { setEditId(item.id); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => { const copy = { ...item, id: ssId('MENU'), name: `${item.name} (salinan)` }; ssSet('products', [...ssGet<Product[]>('products'), copy]); onToast('Menu berhasil diduplikasi'); refresh(); }}>Salin</SmallBtn><SmallBtn onClick={() => setDelId(item.id)}>Hapus</SmallBtn></div></div></article>)}</div> : <EmptyState title="Belum ada menu" text="Tambahkan menu pertama untuk mulai mengelola Selera Sambal." action={<button onClick={() => { setEditId(undefined); setShowF(true); }} className={bPri}>+ Tambah Menu</button>} />}
      {showF && <ProductForm productId={editId} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}
      {delId && <ConfirmModal message="Hapus menu ini?" onConfirm={() => { ssSet('products', ssGet<Product[]>('products').filter(p => p.id !== delId)); onToast('Menu berhasil dihapus'); refresh(); }} onClose={() => setDelId(null)} />}
    </div>
  );
}

function CategoriesPage({ onToast }: { onToast: (m: string) => void }) {
  const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1);
  const [showF, setShowF] = useState(false); const [editId, setEditId] = useState<string | undefined>(); const [delId, setDelId] = useState<string | null>(null);
  const categories = ssGet<Category[]>('categories'); const products = ssGet<Product[]>('products');
  return <div key={tick}><PageHeading title="Kategori" desc="Kelompokkan menu agar mudah dicari." action={<button onClick={() => { setEditId(undefined); setShowF(true); }} className={bPri}>+ Tambah Kategori</button>} />{categories.length ? <DataTable headers={['Kategori','Deskripsi','Jumlah Menu','Aksi']} rows={categories.map(c => [<b key="n">{c.name}</b>, c.description || '—', `${products.filter(p => p.category === c.name).length} menu`, <div key="a" className="flex gap-1"><SmallBtn onClick={() => { setEditId(c.id); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelId(c.id)}>Hapus</SmallBtn></div>])} /> : <EmptyState title="Belum ada kategori" text="Buat kategori pertama untuk menata menu Anda." />}{showF && <SimpleForm type="categories" id={editId} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}{delId && <ConfirmModal message="Hapus kategori ini?" onConfirm={() => { ssSet('categories', ssGet<Category[]>('categories').filter(c => c.id !== delId)); onToast('Kategori berhasil dihapus'); refresh(); }} onClose={() => setDelId(null)} />}</div>;
}

function OrdersPage({ onToast }: { onToast: (m: string) => void }) {
  const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1);
  const [search, setSearch] = useState(''); const [statF, setStatF] = useState('');
  const [showF, setShowF] = useState(false); const [detailId, setDetailId] = useState<string | null>(null);
  const orders = ssGet<Order[]>('orders');
  const shown = orders.filter(o => `${o.id}${o.customer}`.toLowerCase().includes(search.toLowerCase()) && (!statF || o.status === statF));
  return <div key={tick}><PageHeading title="Pesanan" desc="Pantau pesanan yang masuk." action={<button onClick={() => setShowF(true)} className={bPri}>+ Tambah Pesanan</button>} /><div className="flex flex-wrap gap-[9px] mb-[18px]"><input className={iCls + ' min-w-[210px]'} placeholder="Cari ID atau pelanggan" value={search} onChange={e => setSearch(e.target.value)} /><select className={iCls} value={statF} onChange={e => setStatF(e.target.value)}><option value="">Semua status</option>{['Baru','Diproses','Siap','Selesai','Dibatalkan'].map(s => <option key={s}>{s}</option>)}</select></div>{shown.length ? <DataTable headers={['Order ID','Pelanggan','Item','Total','Status','Waktu','Aksi']} rows={shown.map(o => [<b key="i">{o.id}</b>, o.customer, o.items.map(i => `${i.name} x${i.qty}`).join(', '), rupiah(o.total), <Badge key="s" status={o.status} />, fmtDate(o.createdAt), <SmallBtn key="d" onClick={() => setDetailId(o.id)}>Detail</SmallBtn>])} /> : <EmptyState title="Belum ada pesanan" text="Pesanan yang masuk akan muncul di sini." />}{showF && <OrderForm onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}{detailId && <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} onSaved={m => { onToast(m); refresh(); }} />}</div>;
}

function CustomersPage() { const customers = ssGet<Customer[]>('customers'); const orders = ssGet<Order[]>('orders'); return <div><PageHeading title="Pelanggan" desc="Pelanggan terbentuk otomatis ketika pesanan disimpan." />{customers.length ? <DataTable headers={['Pelanggan','Kontak','Jumlah Order','Total Belanja']} rows={customers.map(c => { const h = orders.filter(o => o.customer === c.name); return [<b key="n">{c.name}</b>, c.phone || '—', h.length, rupiah(h.reduce((s, o) => s + Number(o.total), 0))]; })} /> : <EmptyState title="Belum ada pelanggan" text="Pelanggan baru akan muncul dari pesanan." />}</div>; }
function AnalyticsPage() { const orders = ssGet<Order[]>('orders'); const revenue = orders.filter(o => o.status !== 'Dibatalkan').reduce((s, o) => s + Number(o.total), 0); return <div><PageHeading title="Analitik" desc="Keputusan bisnis berdasarkan transaksi nyata." />{orders.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatCard icon="Rp" label="Total Revenue" value={rupiah(revenue)} /><StatCard icon="▤" label="Total Pesanan" value={orders.length} /><StatCard icon="+" label="Rata-rata Pesanan" value={rupiah(revenue / orders.length)} /></div> : <EmptyState title="Belum cukup data" text="Tambahkan pesanan untuk melihat pola penjualan." />}</div>; }
function PromotionsPage({ onToast }: { onToast: (m: string) => void }) { const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1); const [showF, setShowF] = useState(false); const [editId, setEditId] = useState<string | undefined>(); const [delId, setDelId] = useState<string | null>(null); const items = ssGet<Promotion[]>('promotions'); return <div key={tick}><PageHeading title="Promo" desc="Kelola penawaran restoran." action={<button onClick={() => { setEditId(undefined); setShowF(true); }} className={bPri}>+ Tambah Promo</button>} />{items.length ? <DataTable headers={['Nama Promo','Kode','Diskon','Status','Aksi']} rows={items.map(p => [<b key="n">{p.name}</b>, p.code, p.kind === 'Persentase' ? `${p.value}%` : rupiah(p.value), <Badge key="s" status={p.status} />, <div key="a" className="flex gap-1"><SmallBtn onClick={() => { setEditId(p.id); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelId(p.id)}>Hapus</SmallBtn></div>])} /> : <EmptyState title="Belum ada promo" text="Buat promo untuk menarik lebih banyak pesanan." />}{showF && <SimpleForm type="promotions" id={editId} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}{delId && <ConfirmModal message="Hapus promo ini?" onConfirm={() => { ssSet('promotions', ssGet<Promotion[]>('promotions').filter(p => p.id !== delId)); onToast('Promo berhasil dihapus'); refresh(); }} onClose={() => setDelId(null)} />}</div>; }
function InventoryPage() { const products = ssGet<Product[]>('products'); const { stockThreshold } = ssGet<AppSettings>('settings'); const threshold = Number(stockThreshold); return <div><PageHeading title="Inventori" desc={`Stok menipis saat <= ${threshold}. Ubah batasnya di Pengaturan.`} />{products.length ? <DataTable headers={['Menu','Kategori','Stok','Status']} rows={products.map(p => [<b key="n">{p.name}</b>, p.category || '—', p.stock, <Badge key="s" status={p.stock === 0 ? 'Habis' : p.stock <= threshold ? 'Menipis' : 'Aman'} />])} /> : <EmptyState title="Belum ada inventori" text="Stok menu akan tampil saat menu ditambahkan." />}</div>; }
function ReviewsPage({ onToast }: { onToast: (m: string) => void }) { const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1); const [showF, setShowF] = useState(false); const [editId, setEditId] = useState<string | undefined>(); const [delId, setDelId] = useState<string | null>(null); const items = ssGet<Review[]>('reviews'); return <div key={tick}><PageHeading title="Ulasan" desc="Tinjau pengalaman pelanggan." action={<button onClick={() => { setEditId(undefined); setShowF(true); }} className={bPri}>+ Tambah Ulasan</button>} />{items.length ? <DataTable headers={['Pelanggan','Menu','Rating','Komentar','Status','Aksi']} rows={items.map(r => [<b key="c">{r.customer}</b>, r.menu || '—', '★'.repeat(r.rating), r.comment || '—', <Badge key="s" status={r.status} />, <div key="a" className="flex gap-1"><SmallBtn onClick={() => { setEditId(r.id); setShowF(true); }}>Edit</SmallBtn><SmallBtn onClick={() => setDelId(r.id)}>Hapus</SmallBtn></div>])} /> : <EmptyState title="Belum ada ulasan" text="Ulasan pelanggan akan muncul di sini." />}{showF && <SimpleForm type="reviews" id={editId} onClose={() => setShowF(false)} onSaved={m => { onToast(m); refresh(); }} />}{delId && <ConfirmModal message="Hapus ulasan ini?" onConfirm={() => { ssSet('reviews', ssGet<Review[]>('reviews').filter(r => r.id !== delId)); onToast('Ulasan berhasil dihapus'); refresh(); }} onClose={() => setDelId(null)} />}</div>; }
function NotificationsPage({ onToast }: { onToast: (m: string) => void }) { const [tick, setTick] = useState(0); const refresh = () => setTick(t => t + 1); const items = ssGet<Notification[]>('notifications'); const rev = [...items].reverse(); return <div key={tick}><PageHeading title="Notifikasi" desc="Tetap tahu setiap perubahan penting." action={items.length ? <button onClick={() => { ssSet('notifications', items.map(n => ({ ...n, read: true }))); onToast('Semua notifikasi sudah dibaca'); refresh(); }} className={bSec}>Tandai semua dibaca</button> : undefined} />{rev.length ? <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)]"><div className="flex flex-col gap-3">{rev.map(n => <div key={n.id} className="flex items-center gap-3 pb-3 border-b border-[#e9e3dc] last:border-0 last:pb-0"><span className="w-[34px] h-[34px] bg-[#fff0df] rounded-[8px] grid place-items-center text-[#bb7420] shrink-0">◌</span><div className="flex-1"><b className="block text-sm">{n.text}</b><small className="text-[#827a73] text-xs">{fmtDate(n.createdAt)}</small></div><Badge status={n.read ? 'Dibaca' : 'Baru'} /><button onClick={() => { ssSet('notifications', items.filter(i => i.id !== n.id)); refresh(); }} className="text-[#827a73] text-lg hover:text-[#aa2027] px-1">x</button></div>)}</div></section> : <EmptyState title="Belum ada notifikasi" text="Pemberitahuan operasional akan tampil di sini." />}</div>; }
function SettingsPage({ onToast }: { onToast: (m: string) => void }) {
  const restaurant = ssGet<Restaurant>('restaurant'); const settings = ssGet<AppSettings>('settings'); const admin = ssGet<AdminUser>('admin');
  const [rF, setRF] = useState<Restaurant>({ ...restaurant }); const [sF, setSF] = useState<AppSettings>({ ...settings }); const [aF, setAF] = useState<AdminUser>({ ...admin });
  const [showReset, setShowReset] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); ssSet('restaurant', rF); ssSet('settings', sF); ssSet('admin', aF); onToast('Pengaturan berhasil disimpan'); };
  const onExport = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ssBackup()], { type: 'application/json' })); a.download = 'selera-sambal-backup.json'; a.click(); };
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { ssRestore(JSON.parse(r.result as string)); onToast('Data berhasil diimpor'); } catch { onToast('File backup tidak valid.'); } }; r.readAsText(file); };
  return (
    <div>
      <PageHeading title="Pengaturan" desc="Semua informasi restoran disimpan secara lokal." />
      <form onSubmit={submit}>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Profil Restoran</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Nama Restoran<input className={iCls} value={rF.name} onChange={e => setRF(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Telepon<input className={iCls} value={rF.phone} onChange={e => setRF(f => ({ ...f, phone: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Email<input className={iCls} value={rF.email} onChange={e => setRF(f => ({ ...f, email: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Jam Operasional<input className={iCls} value={rF.hours} onChange={e => setRF(f => ({ ...f, hours: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Alamat<textarea className={`${iCls} min-h-[80px] resize-y`} value={rF.address} onChange={e => setRF(f => ({ ...f, address: e.target.value }))} /></label>
          </div>
        </section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Pengaturan Pesanan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Warna Utama<input type="color" className={iCls} value={sF.primary} onChange={e => setSF(f => ({ ...f, primary: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Batas Stok<input type="number" className={iCls} value={sF.stockThreshold} onChange={e => setSF(f => ({ ...f, stockThreshold: Number(e.target.value) }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Prefix Pesanan<input className={iCls} value={sF.orderPrefix} onChange={e => setSF(f => ({ ...f, orderPrefix: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Pajak (%)<input type="number" className={iCls} value={sF.tax} onChange={e => setSF(f => ({ ...f, tax: Number(e.target.value) }))} /></label>
          </div>
        </section>
        <section className="bg-white border border-[#e9e3dc] rounded-[16px] p-5 shadow-[0_10px_30px_rgba(65,39,23,.07)] mb-5">
          <h2 className="text-base font-bold mb-4">Profil Admin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <label className="grid text-xs font-bold gap-[6px]">Nama Admin<input className={iCls} value={aF.name} onChange={e => setAF(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px]">Username<input className={iCls} value={aF.username} onChange={e => setAF(f => ({ ...f, username: e.target.value }))} /></label>
            <label className="grid text-xs font-bold gap-[6px] sm:col-span-2">Password Lokal<input type="password" className={iCls} value={aF.password} onChange={e => setAF(f => ({ ...f, password: e.target.value }))} /></label>
          </div>
        </section>
        <div className="flex flex-wrap gap-[9px] justify-end">
          <button type="button" onClick={onExport} className={bSec}>Ekspor Data</button>
          <label className={`${bSec} cursor-pointer`}>Impor Data<input type="file" accept="application/json" hidden onChange={onImport} /></label>
          <button type="button" onClick={() => setShowReset(true)} className="inline-flex items-center gap-2 font-bold px-4 py-[10px] rounded-[9px] bg-[#fdecec] text-[#c34040] text-sm hover:bg-[#fbd6d6]">Reset Semua</button>
          <button type="submit" className={bPri}>Simpan Pengaturan</button>
        </div>
      </form>
      {showReset && <ConfirmModal message="Reset seluruh data lokal? Tindakan ini tidak dapat dibatalkan." onConfirm={() => { ssReset(); onToast('Semua data sudah direset'); }} onClose={() => setShowReset(false)} />}
    </div>
  );
}

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
const NAV: { key: ActivePage; icon: string; label: string; group: string }[] = [
  { key: 'dashboard', icon: '▦', label: 'Dashboard', group: 'UTAMA' },
  { key: 'products', icon: '▣', label: 'Menu', group: 'MANAJEMEN' },
  { key: 'categories', icon: '◫', label: 'Kategori', group: 'MANAJEMEN' },
  { key: 'orders', icon: '◉', label: 'Pesanan', group: 'MANAJEMEN' },
  { key: 'customers', icon: '♙', label: 'Pelanggan', group: 'MANAJEMEN' },
  { key: 'analytics', icon: '⌁', label: 'Analitik', group: 'BISNIS' },
  { key: 'promotions', icon: '✦', label: 'Promo', group: 'BISNIS' },
  { key: 'inventory', icon: '▤', label: 'Inventori', group: 'BISNIS' },
  { key: 'reviews', icon: '☆', label: 'Ulasan', group: 'ENGAGEMENT' },
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
      case 'customers': return <CustomersPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'promotions': return <PromotionsPage onToast={addToast} />;
      case 'inventory': return <InventoryPage />;
      case 'reviews': return <ReviewsPage onToast={addToast} />;
      case 'notifications': return <NotificationsPage onToast={addToast} />;
      case 'settings': return <SettingsPage onToast={addToast} />;
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
              <div className="hidden md:block text-sm text-[#827a73]"><b className="text-[#292522] text-base">{PAGE_LABELS[page][0]}</b> / {PAGE_LABELS[page][1]}</div>
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