'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Settings as SettingsIcon,
  CheckCircle,
  Clock,
  Printer,
  Plus,
  Trash2,
  Lock,
  QrCode,
} from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { IOrder, IMenuItem, IPromo, ISettings, ITable } from '@/lib/models';
import { STATIC_MENU_ITEMS } from '@/lib/staticData';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices' | 'settings'>('orders');

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
  const [selectedInvoice, setSelectedInvoice] = useState<IOrder | null>(null);

  // Settings State
  const [taxRate, setTaxRate] = useState<number>(10);
  const [serviceRate, setServiceRate] = useState<number>(5);

  // Load Admin Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        if (!selectedInvoice && data.orders.length > 0) {
          setSelectedInvoice(data.orders[0]);
        }
      }

      const menuRes = await fetch('/api/menu');
      const menuData = await menuRes.json();
      if (menuData.menuItems) setMenuItems(menuData.menuItems);
    } catch (err) {
      console.log('Error fetching admin data');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const timer = setInterval(fetchData, 6000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123' || password === 'staff') {
      setIsAuthenticated(true);
    } else {
      alert('Password staff salah. Gunakan: admin123');
    }
  };

  const updateOrderStatus = async (orderCode: string, newStatus: 'received' | 'preparing' | 'ready' | 'completed') => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.orderCode === orderCode ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      alert('Gagal mengupdate status pesanan');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#2a1a15]">
        <form
          onSubmit={handleLogin}
          className="bg-[#fdf1ee] border border-[#f5c7bc] rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-[#7a2323] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-serif italic font-bold text-2xl text-[#7a2323]">Staff Login</h2>
            <p className="text-xs text-[#735a52] mt-1">Selera Sambal Admin Dashboard</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan Password"
            className="w-full px-4 py-3 rounded-2xl border border-[#f5c7bc] bg-white text-sm text-[#2a1a15] placeholder-[#9e8d87] focus:outline-none focus:border-[#7a2323]"
          />
          <button
            type="submit"
            className="w-full py-3.5 bg-[#7a2323] hover:bg-[#631c1c] text-white font-bold text-sm rounded-full shadow-md transition-colors"
          >
            Masuk Portal Staff
          </button>
        </form>
      </main>
    );
  }

  // Dashboard Stats
  const todayRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;

  return (
    <main className="min-h-screen bg-[#fdf1ee] pb-24">
      {/* Top Admin Header */}
      <header className="bg-[#7a2323] text-white px-6 py-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌶️</span>
          <h1 className="font-serif italic font-bold text-xl">Selera Sambal — Staff Admin</h1>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
        >
          Keluar
        </button>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-white border-b border-[#f5c7bc] px-6 py-3 flex gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'overview' ? 'bg-[#7a2323] text-white' : 'text-[#5a423a] hover:bg-[#fce9e4]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'orders' ? 'bg-[#7a2323] text-white' : 'text-[#5a423a] hover:bg-[#fce9e4]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pesanan Live ({activeOrdersCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'invoices' ? 'bg-[#7a2323] text-white' : 'text-[#5a423a] hover:bg-[#fce9e4]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Struk / Invoice</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'settings' ? 'bg-[#7a2323] text-white' : 'text-[#5a423a] hover:bg-[#fce9e4]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Pengaturan</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card">
                <span className="text-xs uppercase font-bold text-[#8c5950]">Total Pesanan Hari Ini</span>
                <div className="font-serif font-bold text-3xl text-[#7a2323] mt-2">{orders.length}</div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card">
                <span className="text-xs uppercase font-bold text-[#8c5950]">Total Pendapatan (Gross)</span>
                <div className="font-serif font-bold text-3xl text-[#7a2323] mt-2">{formatRupiah(todayRevenue)}</div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card">
                <span className="text-xs uppercase font-bold text-[#8c5950]">Pesanan Aktif Dapur</span>
                <div className="font-serif font-bold text-3xl text-[#ca8a04] mt-2">{activeOrdersCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="font-serif italic font-bold text-2xl text-[#7a2323]">Kelola Pesanan Masuk</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#f5c7bc] text-[#8c5950]">
                Belum ada pesanan masuk.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((o) => (
                  <div key={o.orderCode} className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-[#f3d9d3]">
                      <div>
                        <span className="font-bold text-[#7a2323] text-base">{o.orderCode}</span>
                        <span className="ml-2 text-xs font-semibold text-[#5a423a]">(Meja {o.tableNumber})</span>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#fce9e4] font-bold text-[#7a2323] uppercase">
                        {o.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-[#5a423a]">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.qty}x {it.name} {it.spiceLevel ? `(${it.spiceLevel})` : ''}</span>
                          <span className="font-semibold">{formatRupiah(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    {o.notes && (
                      <div className="text-xs bg-[#fdf1ee] p-2.5 rounded-xl border border-[#f5c7bc] italic text-[#7a2323]">
                        Catatan: {o.notes}
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-2 border-t border-[#f3d9d3]">
                      <span className="text-xs font-bold text-[#5a423a]">Total</span>
                      <span className="font-bold text-base text-[#7a2323]">{formatRupiah(o.total)}</span>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <button
                        onClick={() => updateOrderStatus(o.orderCode, 'received')}
                        className={`py-1.5 rounded-full text-[10px] font-bold ${
                          o.status === 'received' ? 'bg-[#7a2323] text-white' : 'bg-[#fce9e4] text-[#7a2323]'
                        }`}
                      >
                        Diterima
                      </button>
                      <button
                        onClick={() => updateOrderStatus(o.orderCode, 'preparing')}
                        className={`py-1.5 rounded-full text-[10px] font-bold ${
                          o.status === 'preparing' ? 'bg-[#ca8a04] text-white' : 'bg-[#fce9e4] text-[#ca8a04]'
                        }`}
                      >
                        Disiapkan
                      </button>
                      <button
                        onClick={() => updateOrderStatus(o.orderCode, 'ready')}
                        className={`py-1.5 rounded-full text-[10px] font-bold ${
                          o.status === 'ready' || o.status === 'completed'
                            ? 'bg-[#15803d] text-white'
                            : 'bg-[#fce9e4] text-[#15803d]'
                        }`}
                      >
                        Disajikan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INVOICES / STRUK PRINT VIEW */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Order Selector */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="font-bold text-base text-[#2a1a15]">Pilih Pesanan</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {orders.map((o) => (
                  <button
                    key={o.orderCode}
                    onClick={() => setSelectedInvoice(o)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedInvoice?.orderCode === o.orderCode
                        ? 'bg-[#7a2323] text-white border-[#7a2323]'
                        : 'bg-white text-[#2a1a15] border-[#f5c7bc] hover:bg-[#fce9e4]'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-sm">
                      <span>{o.orderCode}</span>
                      <span>Meja {o.tableNumber}</span>
                    </div>
                    <div className="text-xs opacity-80 mt-1">{formatRupiah(o.total)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Receipt / Struk Printable View */}
            <div className="lg:col-span-8">
              {selectedInvoice ? (
                <div className="bg-white rounded-3xl p-8 border border-[#f5c7bc] shadow-card max-w-lg mx-auto space-y-6">
                  <div className="text-center space-y-1 border-b pb-4 border-dashed border-gray-300">
                    <h2 className="font-serif italic font-bold text-2xl text-[#7a2323]">Selera Sambal</h2>
                    <p className="text-xs text-gray-600">Jl. Nusantara No. 14, Jakarta</p>
                    <p className="text-xs text-gray-600">Telp: +62 812-3456-7890</p>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 border-b pb-4 border-dashed border-gray-300">
                    <div className="flex justify-between">
                      <span>No. Struk: {selectedInvoice.orderCode}</span>
                      <span>Meja: {selectedInvoice.tableNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal: {formatDateTime(selectedInvoice.createdAt || new Date())}</span>
                      <span>Kasir: Staff Dine-in</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 text-xs border-b pb-4 border-dashed border-gray-300">
                    {selectedInvoice.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{it.name}</div>
                          <div className="text-[10px] text-gray-500">{it.qty} x {formatRupiah(it.price)}</div>
                        </div>
                        <span className="font-bold text-gray-800">{formatRupiah(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pajak Restoran (PB1 10%)</span>
                      <span>{formatRupiah(selectedInvoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charge (5%)</span>
                      <span>{formatRupiah(selectedInvoice.serviceChargeAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-[#7a2323] pt-2 border-t border-gray-200">
                      <span>TOTAL KESELURUHAN</span>
                      <span>{formatRupiah(selectedInvoice.total)}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => window.print()}
                      className="w-full py-3 bg-[#7a2323] hover:bg-[#631c1c] text-white font-bold text-sm rounded-full flex items-center justify-center gap-2 shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Struk</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-[#f5c7bc]">
                  Pilih pesanan untuk melihat struk.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & MENU MANAGER */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-4">
              <h3 className="font-serif italic font-bold text-xl text-[#7a2323]">Pengaturan Tarif & Pajak</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-bold text-[#5a423a]">Pajak Restoran (PB1 %)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full p-3 mt-1 rounded-2xl border border-[#f5c7bc] text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#5a423a]">Service Charge (%)</label>
                  <input
                    type="number"
                    value={serviceRate}
                    onChange={(e) => setServiceRate(Number(e.target.value))}
                    className="w-full p-3 mt-1 rounded-2xl border border-[#f5c7bc] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#f5c7bc] shadow-card space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-serif italic font-bold text-xl text-[#7a2323]">Daftar Menu Makanan</h3>
              </div>
              <div className="space-y-3">
                {menuItems.map((item) => (
                  <div key={item._id} className="flex justify-between items-center p-4 rounded-2xl border border-[#f5c7bc]">
                    <div>
                      <div className="font-bold text-base text-[#2a1a15]">{item.name}</div>
                      <div className="text-xs text-[#735a52]">{item.category} • {formatRupiah(item.price)}</div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-[#fce9e4] rounded-full font-bold text-[#7a2323]">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
