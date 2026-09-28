'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  BarChart3,
  Utensils,
  Award,
  Flame,
  Filter,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowUpRight,
  Search,
} from 'lucide-react';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  menuItemId?: string;
  spiceLevel?: string;
  addOns?: { label: string; price: number }[];
}

export interface Order {
  id?: string;
  _id?: string;
  orderCode: string;
  tableNumber: number;
  items: OrderItem[];
  notes?: string;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  couponCode?: string | null;
  discountAmount?: number;
  total: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AnalyticsDashboardProps {
  onToast?: (message: string) => void;
}

// Rupiah formatter helper
function rupiah(v: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

// Play pleasant web audio chime for new orders
function playNewOrderSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    // Upbeat two-tone chime (E5 -> A5)
    playTone(659.25, 0, 0.25);
    playTone(880.0, 0.15, 0.4);
  } catch {
    // Ignore audio permission restrictions
  }
}

export default function AnalyticsDashboard({ onToast }: AnalyticsDashboardProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'thisMonth' | 'all' | 'custom'>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all_valid' | 'completed' | 'all'>('all_valid');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [bestSellerSort, setBestSellerSort] = useState<'qty' | 'revenue'>('qty');
  const [searchTx, setSearchTx] = useState('');

  // Tooltip state for SVG chart
  const [hoveredBar, setHoveredBar] = useState<{
    label: string;
    revenue: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const prevOrderCountRef = useRef<number | null>(null);

  // ── Fetch orders with Realtime Support ──────────────────────────────────────
  const fetchOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsSyncing(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal mengambil data pesanan');
      const data = await res.json();
      const freshOrders: Order[] = data.orders || [];

      // Check for incoming new orders during realtime poll
      if (prevOrderCountRef.current !== null && freshOrders.length > prevOrderCountRef.current) {
        const diff = freshOrders.length - prevOrderCountRef.current;
        const msg = `${diff} pesanan baru baru saja masuk!`;
        setNewOrderAlert(msg);
        if (soundEnabled) playNewOrderSound();
        if (onToast) onToast(`⚡ ${msg}`);
        setTimeout(() => setNewOrderAlert(null), 5000);
      }
      prevOrderCountRef.current = freshOrders.length;

      setOrders(freshOrders);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics orders:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [soundEnabled, onToast]);

  // Initial load
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Realtime Polling (every 6 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // ── Filter orders based on Date & Status ───────────────────────────────────
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter === 'all_valid') {
        if (order.status === 'cancelled' || order.status === 'batal') return false;
      } else if (statusFilter === 'completed') {
        if (order.status !== 'completed' && order.status !== 'selesai') return false;
      }

      // 2. Date Filter
      if (!order.createdAt) return true;
      const orderTime = new Date(order.createdAt).getTime();

      if (dateRange === 'today') {
        return orderTime >= todayStart;
      }
      if (dateRange === '7days') {
        const sevenDaysAgo = todayStart - 6 * 24 * 60 * 60 * 1000;
        return orderTime >= sevenDaysAgo;
      }
      if (dateRange === '30days') {
        const thirtyDaysAgo = todayStart - 29 * 24 * 60 * 60 * 1000;
        return orderTime >= thirtyDaysAgo;
      }
      if (dateRange === 'thisMonth') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return orderTime >= firstDayOfMonth;
      }
      if (dateRange === 'custom') {
        if (customStart) {
          const start = new Date(customStart + 'T00:00:00').getTime();
          if (orderTime < start) return false;
        }
        if (customEnd) {
          const end = new Date(customEnd + 'T23:59:59').getTime();
          if (orderTime > end) return false;
        }
        return true;
      }

      return true; // 'all'
    });
  }, [orders, dateRange, customStart, customEnd, statusFilter]);

  // ── Key Metrics (KPIs) ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const count = filteredOrders.length;
    let totalRevenue = 0;
    let subtotal = 0;
    let taxTotal = 0;
    let serviceTotal = 0;
    let discountTotal = 0;
    let totalItemsSold = 0;

    filteredOrders.forEach((o) => {
      totalRevenue += Number(o.total) || 0;
      subtotal += Number(o.subtotal) || 0;
      taxTotal += Number(o.taxAmount) || 0;
      serviceTotal += Number(o.serviceChargeAmount) || 0;
      discountTotal += Number(o.discountAmount) || 0;

      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          totalItemsSold += Number(item.qty) || 0;
        });
      }
    });

    const aov = count > 0 ? Math.round(totalRevenue / count) : 0;

    return {
      totalRevenue,
      subtotal,
      taxTotal,
      serviceTotal,
      discountTotal,
      orderCount: count,
      aov,
      totalItemsSold,
    };
  }, [filteredOrders]);

  // ── Revenue Chart Data (Harian / Mingguan / Bulanan) ────────────────────────
  const chartData = useMemo(() => {
    if (timeframe === 'daily') {
      // Create buckets for the last 7 to 14 days or filtered period
      const daysCount = dateRange === 'today' ? 1 : dateRange === '30days' ? 30 : 7;
      const buckets: Record<string, { label: string; dateKey: string; revenue: number; count: number }> = {};
      const now = new Date();

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const label = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
        buckets[dateKey] = { label, dateKey, revenue: 0, count: 0 };
      }

      filteredOrders.forEach((o) => {
        if (!o.createdAt) return;
        const d = new Date(o.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        if (buckets[key]) {
          buckets[key].revenue += Number(o.total) || 0;
          buckets[key].count += 1;
        } else if (dateRange === 'all' || dateRange === 'custom') {
          const label = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
          buckets[key] = {
            label,
            dateKey: key,
            revenue: Number(o.total) || 0,
            count: 1,
          };
        }
      });

      return Object.values(buckets).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }

    if (timeframe === 'weekly') {
      // 8 weeks bucket
      const now = new Date();
      const buckets: Record<string, { label: string; revenue: number; count: number }> = {};

      for (let w = 7; w >= 0; w--) {
        const weekStart = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const label = `Mg ${w === 0 ? 'Ini' : `${w} lalu`}`;
        const key = `week-${w}`;
        buckets[key] = { label, revenue: 0, count: 0 };
      }

      filteredOrders.forEach((o) => {
        if (!o.createdAt) return;
        const oTime = new Date(o.createdAt).getTime();
        const diffWeeks = Math.floor((now.getTime() - oTime) / (7 * 24 * 60 * 60 * 1000));
        if (diffWeeks >= 0 && diffWeeks < 8) {
          const key = `week-${diffWeeks}`;
          if (buckets[key]) {
            buckets[key].revenue += Number(o.total) || 0;
            buckets[key].count += 1;
          }
        }
      });

      return Object.values(buckets);
    }

    // Monthly bucket (last 6 months)
    const now = new Date();
    const buckets: Record<string, { label: string; revenue: number; count: number }> = {};

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(d);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { label, revenue: 0, count: 0 };
    }

    filteredOrders.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) {
        buckets[key].revenue += Number(o.total) || 0;
        buckets[key].count += 1;
      }
    });

    return Object.values(buckets);
  }, [filteredOrders, timeframe, dateRange]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartData.map((d) => d.revenue), 100000);
  }, [chartData]);

  // ── Best Sellers (Menu Terlaris) ───────────────────────────────────────────
  const bestSellers = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; orderCount: number }>();

    filteredOrders.forEach((order) => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item) => {
        const name = (item.name || 'Menu Lain').trim();
        const existing = map.get(name) || { name, qty: 0, revenue: 0, orderCount: 0 };
        existing.qty += Number(item.qty) || 0;
        existing.revenue += Number(item.lineTotal || item.price * item.qty) || 0;
        existing.orderCount += 1;
        map.set(name, existing);
      });
    });

    const list = Array.from(map.values());
    if (bestSellerSort === 'qty') {
      list.sort((a, b) => b.qty - a.qty);
    } else {
      list.sort((a, b) => b.revenue - a.revenue);
    }

    const totalQty = list.reduce((acc, curr) => acc + curr.qty, 0);

    return list.slice(0, 10).map((item, index) => ({
      ...item,
      rank: index + 1,
      sharePercent: totalQty > 0 ? Math.round((item.qty / totalQty) * 100) : 0,
    }));
  }, [filteredOrders, bestSellerSort]);

  // ── Peak Hours (Jam Paling Ramai) ──────────────────────────────────────────
  const peakHoursData = useMemo(() => {
    // 24 hours distribution (00:00 - 23:00)
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      count: 0,
      revenue: 0,
    }));

    filteredOrders.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      const h = d.getHours();
      if (hours[h]) {
        hours[h].count += 1;
        hours[h].revenue += Number(o.total) || 0;
      }
    });

    const maxCount = Math.max(...hours.map((h) => h.count), 1);

    // Find the primary peak hour
    let peakHour = hours[0];
    hours.forEach((h) => {
      if (h.count > peakHour.count) {
        peakHour = h;
      }
    });

    // Operational business hours (focus on 08:00 - 23:00 for cleaner display)
    const displayHours = hours.slice(8, 24);

    return {
      allHours: hours,
      displayHours,
      maxCount,
      peakHour,
    };
  }, [filteredOrders]);

  // ── Export to Excel (CSV with UTF-8 BOM) ────────────────────────────────────
  const handleExportExcel = () => {
    try {
      const nowStr = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(new Date());

      let csv = '\uFEFF'; // UTF-8 BOM for MS Excel compatibility
      csv += 'LAPORAN PENJUALAN & ANALITIK RESTORAN - WARKOP BETAWA\n';
      csv += `Waktu Cetak Export,${nowStr}\n`;
      csv += `Filter Rentang Tanggal,${dateRange.toUpperCase()}\n`;
      csv += `Status Pesanan Termasuk,${statusFilter}\n\n`;

      // 1. Executive Summary
      csv += '=== RINGKASAN EKSEKUTIF ===\n';
      csv += 'Metrik,Nilai\n';
      csv += `Total Omset Bersih (Net Revenue),${rupiah(metrics.totalRevenue)}\n`;
      csv += `Total Transaksi Masuk,${metrics.orderCount}\n`;
      csv += `Rata-rata Nilai Pesanan (AOV),${rupiah(metrics.aov)}\n`;
      csv += `Total Porsi Menu Terjual,${metrics.totalItemsSold} porsi\n`;
      csv += `Subtotal Kotor,${rupiah(metrics.subtotal)}\n`;
      csv += `Total Potongan Kupon/Diskon,${rupiah(metrics.discountTotal)}\n`;
      csv += `Total Pajak PB1,${rupiah(metrics.taxTotal)}\n`;
      csv += `Total Biaya Layanan,${rupiah(metrics.serviceTotal)}\n\n`;

      // 2. Best Sellers
      csv += '=== 10 MENU TERLARIS (BEST SELLERS) ===\n';
      csv += 'Peringkat,Nama Menu,Porsi Terjual,Total Omset Menu,Kontribusi Volume\n';
      bestSellers.forEach((item) => {
        csv += `"${item.rank}","${item.name}","${item.qty}","${rupiah(item.revenue)}","${item.sharePercent}%"\n`;
      });
      csv += '\n';

      // 3. Peak Hours
      csv += '=== DISTRIBUSI JAM RAMAI (HOURLY TRAFFIC) ===\n';
      csv += 'Jam,Jumlah Pesanan,Total Omset Jam Tersebut\n';
      peakHoursData.displayHours.forEach((h) => {
        csv += `"${h.label} - ${String(h.hour + 1).padStart(2, '0')}:00","${h.count}","${rupiah(h.revenue)}"\n`;
      });
      csv += '\n';

      // 4. Detailed Orders
      csv += '=== RINCIAN RIWAYAT PESANAN LENGKAP ===\n';
      csv += 'Kode Pesanan,Waktu Pemesanan,Nomor Meja,Status,Rincian Menu,Subtotal,Diskon,Pajak,Service,Total Bersih\n';
      filteredOrders.forEach((o) => {
        const timeStr = o.createdAt
          ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(o.createdAt))
          : '-';
        const itemsStr = (o.items || []).map((i) => `${i.name} (x${i.qty})`).join('; ');
        csv += `"${o.orderCode}","${timeStr}","Meja ${o.tableNumber}","${o.status}","${itemsStr}","${o.subtotal}","${o.discountAmount || 0}","${o.taxAmount}","${o.serviceChargeAmount}","${o.total}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Laporan_Penjualan_Warkop_Betawa_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onToast) onToast('Laporan Excel (.CSV) berhasil di-export');
    } catch (err: any) {
      alert('Gagal mengexport file: ' + err.message);
    }
  };

  // ── Export to PDF (Printable Report Window) ─────────────────────────────────
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Izinkan pop-up untuk mencetak atau menyimpan laporan sebagai PDF.');
      return;
    }

    const nowFormatted = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const bestSellersRows = bestSellers
      .map(
        (b) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; text-align: center;">#${b.rank}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${b.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${b.qty} porsi</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${rupiah(b.revenue)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${b.sharePercent}%</td>
        </tr>
      `
      )
      .join('');

    const recentOrdersRows = filteredOrders
      .slice(0, 25)
      .map(
        (o) => `
        <tr>
          <td style="padding: 6px 10px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold;">${o.orderCode}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">Meja ${o.tableNumber}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">${o.items.map((i) => `${i.name} (${i.qty})`).join(', ')}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${rupiah(o.total)}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; font-weight: 600;">${o.status}</span>
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Analitik & Penjualan - Warkop Betawa</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #aa2027;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .logo-title {
              font-size: 24px;
              font-weight: 800;
              color: #aa2027;
              margin: 0;
            }
            .subtitle {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }
            .meta {
              text-align: right;
              font-size: 12px;
              color: #4b5563;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .kpi-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background: #fafafa;
            }
            .kpi-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
            }
            .kpi-val {
              font-size: 18px;
              font-weight: 800;
              color: #111827;
              margin-top: 4px;
            }
            .section-title {
              font-size: 15px;
              font-weight: 700;
              color: #111827;
              margin: 20px 0 10px;
              border-left: 4px solid #aa2027;
              padding-left: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              background: #f9fafb;
              border-bottom: 2px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              color: #4b5563;
            }
            .footer {
              margin-top: 30px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #9ca3af;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="logo-title">WARKOP BETAWA</h1>
              <div class="subtitle">Laporan Penjualan & Analitik Performa Bisnis</div>
            </div>
            <div class="meta">
              <div><strong>Tanggal Cetak:</strong> ${nowFormatted}</div>
              <div><strong>Filter Waktu:</strong> ${dateRange.toUpperCase()}</div>
              <div><strong>Total Transaksi:</strong> ${metrics.orderCount} pesanan</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Omset Bersih</div>
              <div class="kpi-val">${rupiah(metrics.totalRevenue)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Pesanan</div>
              <div class="kpi-val">${metrics.orderCount} Transaksi</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Rata-rata Transaksi (AOV)</div>
              <div class="kpi-val">${rupiah(metrics.aov)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Menu Terjual</div>
              <div class="kpi-val">${metrics.totalItemsSold} Porsi</div>
            </div>
          </div>

          <div class="section-title">10 Menu Terlaris (Best Seller)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">No</th>
                <th>Nama Menu</th>
                <th style="text-align: center;">Porsi Terjual</th>
                <th style="text-align: right;">Total Pendapatan</th>
                <th style="text-align: center;">Pangsa Volume</th>
              </tr>
            </thead>
            <tbody>
              ${bestSellersRows || '<tr><td colspan="5" style="text-align:center; padding:16px;">Belum ada data menu terjual.</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Waktu Tersibuk (Peak Hours)</div>
          <p style="font-size: 12px; color: #4b5563; margin-top: 0;">
            Jam paling ramai tercatat pada pukul <strong>${peakHoursData.peakHour.label} - ${String(peakHoursData.peakHour.hour + 1).padStart(2, '0')}:00</strong> dengan total <strong>${peakHoursData.peakHour.count} pesanan</strong> (${rupiah(peakHoursData.peakHour.revenue)}).
          </p>

          <div class="section-title">Ringkasan Riwayat Transaksi Terbaru</div>
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Meja</th>
                <th>Pesanan</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentOrdersRows || '<tr><td colspan="5" style="text-align:center; padding:16px;">Belum ada pesanan dalam periode ini.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <span>Sistem Kasir & Operasional Warkop Betawa — Dicetak secara otomatis</span>
            <span>Halaman 1 dari 1</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header with Realtime Indicator & Action Buttons ─────────── */}
      <div className="bg-white border border-[#e9e3dc] rounded-2xl p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#292522] m-0">
                Laporan Penjualan & Analitik
              </h1>
              {/* Realtime Live Pulse */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  autoRefresh
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
                title={autoRefresh ? 'Sinkronisasi real-time setiap 6 detik' : 'Pembaruan otomatis dijeda'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {autoRefresh ? 'Live Realtime' : 'Sinkron Jeda'}
              </div>
            </div>
            <p className="text-[#827a73] text-sm mt-1 mb-0 flex items-center gap-2">
              <span>Pantau omset harian, tren menu, jam ramai, dan ekspor laporan bisnis.</span>
              <span className="text-xs text-[#a0978f] border-l border-[#e9e3dc] pl-2 hidden sm:inline">
                Update: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            </p>
          </div>

          {/* Controls & Export buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
              title="Aktif/Nonaktifkan polling otomatis realtime"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto 6s' : 'Manual'}</span>
            </button>

            {/* Sound alert toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                soundEnabled
                  ? 'bg-[#fbf4f4] text-[#aa2027] border-[#f0d4d4]'
                  : 'bg-stone-50 text-stone-400 border-stone-200'
              }`}
              title={soundEnabled ? 'Notifikasi suara pesanan aktif' : 'Suara dinonaktifkan'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => fetchOrders(false)}
              disabled={isSyncing}
              className="px-3 py-2 rounded-lg border border-[#e9e3dc] bg-white hover:bg-[#f6f2ef] text-[#292522] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#aa2027]' : ''}`} />
              <span>Segarkan</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-lg border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-lg bg-[#aa2027] hover:bg-[#88171d] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Live Incoming Order Alert Banner */}
        {newOrderAlert && (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md animate-bounce">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
              <span>{newOrderAlert} Metrik analitik diperbarui secara instan.</span>
            </div>
            <button
              onClick={() => setNewOrderAlert(null)}
              className="text-white/80 hover:text-white text-xs underline font-normal"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ── Filters Section ────────────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-[#f0ebe5] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date range presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#827a73] font-semibold flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Periode:
            </span>
            {(
              [
                ['today', 'Hari Ini'],
                ['7days', '7 Hari'],
                ['30days', '30 Hari'],
                ['thisMonth', 'Bulan Ini'],
                ['all', 'Semua'],
                ['custom', 'Kustom'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  dateRange === key
                    ? 'bg-[#aa2027] text-white shadow-sm'
                    : 'bg-[#f8f5f2] text-[#69615a] hover:bg-[#ede7e1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-[#f8f5f2] p-1.5 rounded-lg border border-[#e9e3dc]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white border border-[#e2dcd5] rounded px-2 py-1 text-xs text-[#292522]"
                placeholder="Mulai"
              />
              <span className="text-[#827a73]">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white border border-[#e2dcd5] rounded px-2 py-1 text-xs text-[#292522]"
                placeholder="Akhir"
              />
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[#827a73] font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#f8f5f2] border border-[#e9e3dc] rounded-md px-2.5 py-1.5 font-medium text-[#292522] outline-none focus:border-[#aa2027]"
            >
              <option value="all_valid">Semua Non-Batal</option>
              <option value="completed">Hanya Selesai (Completed)</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Overview Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Omset */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#827a73] text-xs font-semibold uppercase tracking-wider">
              Total Omset (Net)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#fdf0f0] text-[#aa2027] grid place-items-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-[#292522] tracking-tight">
              {rupiah(metrics.totalRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Realtime dihitung otomatis</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f4efe9] text-[11px] text-[#827a73] flex justify-between">
            <span>Subtotal: {rupiah(metrics.subtotal)}</span>
            <span>Diskon: {rupiah(metrics.discountTotal)}</span>
          </div>
        </div>

        {/* Total Pesanan */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-[#827a73] text-xs font-semibold uppercase tracking-wider">
              Total Pesanan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 grid place-items-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-[#292522] tracking-tight">
              {metrics.orderCount}{' '}
              <span className="text-sm font-normal text-[#827a73]">transaksi</span>
            </div>
            <div className="mt-1 text-[11px] text-[#827a73]">
              Dalam periode terpilih
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f4efe9] text-[11px] text-[#827a73] flex justify-between">
            <span>Porsi Makanan:</span>
            <span className="font-semibold text-[#292522]">{metrics.totalItemsSold} terjual</span>
          </div>
        </div>

        {/* Rata-rata per Pesanan (AOV) */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-[#827a73] text-xs font-semibold uppercase tracking-wider">
              Rata-rata Transaksi (AOV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-[#292522] tracking-tight">
              {rupiah(metrics.aov)}
            </div>
            <div className="mt-1 text-[11px] text-[#827a73]">
              Pengeluaran rata-rata per meja
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f4efe9] text-[11px] text-[#827a73] flex justify-between">
            <span>Pajak Resto:</span>
            <span className="font-semibold text-[#292522]">{rupiah(metrics.taxTotal)}</span>
          </div>
        </div>

        {/* Jam Ramai (Peak Hour) */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-[#827a73] text-xs font-semibold uppercase tracking-wider">
              Jam Paling Ramai
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 grid place-items-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-[#292522] tracking-tight">
              {peakHoursData.peakHour.count > 0 ? peakHoursData.peakHour.label : '—'}
            </div>
            <div className="mt-1 text-[11px] text-rose-600 font-semibold">
              {peakHoursData.peakHour.count > 0
                ? `${peakHoursData.peakHour.count} pesanan pada jam ini`
                : 'Belum ada transaksi'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#f4efe9] text-[11px] text-[#827a73] flex justify-between">
            <span>Omset Jam Ramai:</span>
            <span className="font-semibold text-[#292522]">{rupiah(peakHoursData.peakHour.revenue)}</span>
          </div>
        </div>
      </div>

      {/* ── Main Analytics Section: Grafik Omset & Tren Penjualan ───────── */}
      <div className="bg-white border border-[#e9e3dc] rounded-2xl p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#292522] m-0 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#aa2027]" />
              Grafik Omset Penjualan
            </h2>
            <p className="text-xs text-[#827a73] mt-0.5 mb-0">
              Visualisasi pendapatan berdasarkan rentang waktu terpilih. Arahkan mouse untuk melihat rincian.
            </p>
          </div>

          {/* Timeframe switcher (Harian / Mingguan / Bulanan) */}
          <div className="inline-flex p-1 bg-[#f4efe9] rounded-xl border border-[#e9e3dc] self-start sm:self-auto">
            {(
              [
                ['daily', 'Harian'],
                ['weekly', 'Mingguan'],
                ['monthly', 'Bulanan'],
              ] as const
            ).map(([tKey, tLabel]) => (
              <button
                key={tKey}
                onClick={() => setTimeframe(tKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === tKey
                    ? 'bg-white text-[#aa2027] shadow-sm'
                    : 'text-[#827a73] hover:text-[#292522]'
                }`}
              >
                {tLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Custom SVG Chart */}
        {chartData.length > 0 ? (
          <div className="relative w-full pt-4 pb-2 select-none">
            {/* Floating Tooltip */}
            {hoveredBar && (
              <div
                className="absolute z-20 pointer-events-none bg-[#292522] text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-stone-700 transition-transform duration-75"
                style={{
                  left: `${Math.min(Math.max(hoveredBar.x, 80), window.innerWidth > 768 ? 700 : 250)}px`,
                  top: `${Math.max(hoveredBar.y - 70, 0)}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-bold text-amber-300">{hoveredBar.label}</div>
                <div className="text-sm font-semibold">{rupiah(hoveredBar.revenue)}</div>
                <div className="text-[10px] text-stone-300 mt-0.5">
                  {hoveredBar.count} pesanan {hoveredBar.count > 0 && `(AOV: ${rupiah(hoveredBar.revenue / hoveredBar.count)})`}
                </div>
              </div>
            )}

            {/* SVG Canvas for Bar Chart & Gridlines */}
            <div className="h-[260px] sm:h-[300px] w-full">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 800 280"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#aa2027" />
                    <stop offset="100%" stopColor="#de4c53" />
                  </linearGradient>
                  <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#76131a" />
                    <stop offset="100%" stopColor="#aa2027" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 240 - ratio * 200;
                  const val = maxRevenue * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1="40"
                        y1={y}
                        x2="790"
                        y2={y}
                        stroke="#f0ebe5"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="35"
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#a0978f] text-[9px] font-sans"
                      >
                        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${Math.round(val / 1000)}k`}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {chartData.map((d, idx) => {
                  const totalBars = chartData.length;
                  const availableWidth = 730;
                  const barSlot = availableWidth / totalBars;
                  const barWidth = Math.min(Math.max(barSlot * 0.55, 12), 48);
                  const x = 50 + idx * barSlot + (barSlot - barWidth) / 2;
                  const height = maxRevenue > 0 ? (d.revenue / maxRevenue) * 200 : 0;
                  const y = 240 - height;
                  const isHovered = hoveredBar?.label === d.label;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer transition-all"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredBar({
                          label: d.label,
                          revenue: d.revenue,
                          count: d.count,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Bar shadow/bg column on hover */}
                      <rect
                        x={50 + idx * barSlot}
                        y="20"
                        width={barSlot}
                        height="220"
                        fill={isHovered ? 'rgba(170, 32, 39, 0.05)' : 'transparent'}
                        rx="6"
                      />

                      {/* Main Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(height, 4)}
                        rx="4"
                        fill={isHovered ? 'url(#barHoverGradient)' : 'url(#barGradient)'}
                      />

                      {/* Value label on top of bar if high enough */}
                      {d.revenue > 0 && totalBars <= 14 && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          textAnchor="middle"
                          className="fill-[#69615a] text-[10px] font-bold"
                        >
                          {d.revenue >= 1000000
                            ? `${(d.revenue / 1000000).toFixed(1)}jt`
                            : `${Math.round(d.revenue / 1000)}k`}
                        </text>
                      )}

                      {/* X Axis Label */}
                      <text
                        x={x + barWidth / 2}
                        y="260"
                        textAnchor="middle"
                        className={`text-[10px] font-medium ${
                          isHovered ? 'fill-[#aa2027] font-bold' : 'fill-[#827a73]'
                        }`}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}

                {/* Base axis line */}
                <line x1="40" y1="240" x2="790" y2="240" stroke="#e2dcd5" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-[#827a73]">
            Tidak ada transaksi dalam periode ini.
          </div>
        )}
      </div>

      {/* ── 2-Column Section: Menu Terlaris (Best Sellers) & Jam Paling Ramai (Peak Hours) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Menu Terlaris (Best Seller) */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 grid place-items-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#292522] text-base m-0">Menu Terlaris (Best Seller)</h3>
                  <p className="text-xs text-[#827a73] m-0">Peringkat produk berdasarkan performa penjualan</p>
                </div>
              </div>

              {/* Toggle Sort by Qty vs Revenue */}
              <div className="flex items-center bg-[#f4efe9] p-0.5 rounded-lg border border-[#e9e3dc] text-[11px]">
                <button
                  onClick={() => setBestSellerSort('qty')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    bestSellerSort === 'qty'
                      ? 'bg-white text-[#aa2027] shadow-xs'
                      : 'text-[#827a73] hover:text-[#292522]'
                  }`}
                >
                  Porsi (Qty)
                </button>
                <button
                  onClick={() => setBestSellerSort('revenue')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    bestSellerSort === 'revenue'
                      ? 'bg-white text-[#aa2027] shadow-xs'
                      : 'text-[#827a73] hover:text-[#292522]'
                  }`}
                >
                  Omset (Rp)
                </button>
              </div>
            </div>

            {/* Best Sellers List */}
            {bestSellers.length > 0 ? (
              <div className="space-y-3 mt-4">
                {bestSellers.map((item) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-xl border border-[#f0ebe5] bg-[#faf8f5] hover:bg-white hover:border-[#e2dcd5] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-extrabold grid place-items-center ${
                            item.rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-sm'
                              : item.rank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : item.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {item.rank}
                        </span>
                        <span className="font-bold text-sm text-[#292522]">{item.name}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-[#292522]">
                          {bestSellerSort === 'qty' ? `${item.qty} porsi` : rupiah(item.revenue)}
                        </span>
                        <div className="text-[11px] text-[#827a73]">
                          {bestSellerSort === 'qty' ? rupiah(item.revenue) : `${item.qty} porsi`}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar of Volume Share */}
                    <div className="w-full bg-[#e8e2dc] h-2 rounded-full overflow-hidden flex items-center">
                      <div
                        className="bg-gradient-to-r from-[#aa2027] to-[#e65100] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(item.sharePercent, 4)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#827a73] mt-1">
                      <span>Dipesan di {item.orderCount} transaksi</span>
                      <span className="font-bold text-[#aa2027]">{item.sharePercent}% dari total porsi</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-[#827a73]">
                Belum ada data penjualan menu pada periode ini.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#f0ebe5] text-xs text-[#827a73] flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-[#aa2027]" />
            <span>Fokuskan promo dan stok harian pada 3 menu teratas untuk memaksimalkan margin.</span>
          </div>
        </div>

        {/* 2. Jam Paling Ramai (Peak Hours / Traffic Analysis) */}
        <div className="bg-white border border-[#e9e3dc] rounded-2xl p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 grid place-items-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#292522] text-base m-0">Jam Paling Ramai (Peak Hours)</h3>
                  <p className="text-xs text-[#827a73] m-0">Kepadatan pengunjung per jam operasional</p>
                </div>
              </div>

              {peakHoursData.peakHour.count > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-600" />
                  Peak: {peakHoursData.peakHour.label}
                </div>
              )}
            </div>

            {/* Peak Insight Banner */}
            {peakHoursData.peakHour.count > 0 ? (
              <div className="mb-4 p-3 bg-[#fdf5f5] border border-[#f5d9d9] rounded-xl text-xs text-[#292522]">
                <div className="font-bold text-[#aa2027] flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  Jam Tersibuk: {peakHoursData.peakHour.label} -{' '}
                  {String(peakHoursData.peakHour.hour + 1).padStart(2, '0')}:00
                </div>
                <p className="m-0 text-[#69615a]">
                  Mencatat <strong>{peakHoursData.peakHour.count} pesanan</strong> ({rupiah(peakHoursData.peakHour.revenue)}). Siapkan kru dapur dan bahan baku 30 menit sebelum rentang jam ini.
                </p>
              </div>
            ) : null}

            {/* Hourly Distribution Grid */}
            <div className="space-y-2 mt-2">
              {peakHoursData.displayHours.map((h) => {
                const ratio = peakHoursData.maxCount > 0 ? (h.count / peakHoursData.maxCount) * 100 : 0;
                const isPeak = h.hour === peakHoursData.peakHour.hour && h.count > 0;

                return (
                  <div key={h.hour} className="flex items-center gap-3 text-xs">
                    <span
                      className={`w-12 font-mono font-medium ${
                        isPeak ? 'text-[#aa2027] font-bold' : 'text-[#827a73]'
                      }`}
                    >
                      {h.label}
                    </span>

                    <div className="flex-1 bg-[#f4efe9] h-5 rounded-md overflow-hidden relative">
                      <div
                        className={`h-full rounded-md transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-r from-[#aa2027] to-[#e65100]'
                            : h.count > 0
                            ? 'bg-[#c97d81]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${Math.max(ratio, h.count > 0 ? 8 : 0)}%` }}
                      />
                      {h.count > 0 && (
                        <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white drop-shadow-sm">
                          {h.count} order
                        </span>
                      )}
                    </div>

                    <span className="w-20 text-right font-medium text-[#292522]">
                      {h.count > 0 ? rupiah(h.revenue) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f0ebe5] text-xs text-[#827a73] flex items-center justify-between">
            <span>Operasional: 08:00 - 23:00 WIB</span>
            <span className="font-semibold text-[#aa2027]">
              Total {filteredOrders.length} order tercatat
            </span>
          </div>
        </div>
      </div>

      {/* ── Transaction Table Section (Audit & Drill Down) ────────────────── */}
      <div className="bg-white border border-[#e9e3dc] rounded-2xl p-5 shadow-[0_10px_30px_rgba(65,39,23,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-[#292522] text-base m-0">
              Riwayat Transaksi Analitik ({filteredOrders.length})
            </h3>
            <p className="text-xs text-[#827a73] m-0">
              Semua transaksi yang termasuk dalam perhitungan analitik periode ini.
            </p>
          </div>

          {/* Quick Search in transactions */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#827a73]" />
            <input
              type="text"
              placeholder="Cari kode pesanan / meja..."
              value={searchTx}
              onChange={(e) => setSearchTx(e.target.value)}
              className="w-full bg-[#f8f5f2] border border-[#e9e3dc] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#292522] outline-none focus:border-[#aa2027]"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e9e3dc] bg-[#faf8f5] text-[#827a73] font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Kode Order</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Meja</th>
                <th className="py-2.5 px-3">Rincian Menu</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Diskon</th>
                <th className="py-2.5 px-3 text-right">Total Bersih</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders
                .filter((o) =>
                  `${o.orderCode} meja ${o.tableNumber}`.toLowerCase().includes(searchTx.toLowerCase())
                )
                .slice(0, 30)
                .map((o) => (
                  <tr key={o.id || o.orderCode} className="border-b border-[#f4efe9] hover:bg-[#faf8f5] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#aa2027]">
                      {o.orderCode}
                    </td>
                    <td className="py-2.5 px-3 text-[#827a73]">
                      {o.createdAt
                        ? new Intl.DateTimeFormat('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(o.createdAt))
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#292522]">
                      Meja {o.tableNumber}
                    </td>
                    <td className="py-2.5 px-3 max-w-[240px] truncate text-[#4b4540]">
                      {o.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#827a73]">
                      {rupiah(o.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                      {o.discountAmount ? `-${rupiah(o.discountAmount)}` : 'Rp 0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#292522]">
                      {rupiah(o.total)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.status === 'ready'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : o.status === 'preparing'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="py-8 text-center text-sm text-[#827a73]">
              Tidak ada data transaksi yang sesuai filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
