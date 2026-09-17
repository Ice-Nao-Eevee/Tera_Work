'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, ArrowRight, FileText } from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { IOrder, ISettings } from '@/lib/types';

export default function OrderStatusPage() {
  const params = useParams();
  const rawOrderCode = (params?.orderId as string) || '';
  const decodedOrderCode = decodeURIComponent(rawOrderCode);

  const [order, setOrder] = useState<IOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restaurantInfo, setRestaurantInfo] = useState<ISettings['restaurantInfo'] | null>(null);

  // Poll order status every 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchOrderStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(decodedOrderCode)}`);
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      } catch (err) {
        console.log('Error fetching order status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStatus();
    timer = setInterval(fetchOrderStatus, 5000);
    return () => clearInterval(timer);
  }, [decodedOrderCode]);

  // Fetch restaurant info for the receipt (only needed when completed)
  useEffect(() => {
    if (order?.status !== 'completed' || restaurantInfo) return;
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings?.restaurantInfo) {
          setRestaurantInfo(data.settings.restaurantInfo);
        }
      })
      .catch(() => {});
  }, [order?.status, restaurantInfo]);

  // Stepper — 4 steps including "Selesai"
  const statusSteps = [
    { key: 'received',   label: 'Pesanan Diterima',  desc: 'Diterima oleh dapur' },
    { key: 'preparing',  label: 'Sedang Disiapkan',  desc: 'Memasak & meracik sambal' },
    { key: 'ready',      label: 'Siap Disajikan',    desc: 'Makanan siap diantar ke meja' },
    { key: 'completed',  label: 'Selesai',            desc: 'Pesanan selesai — bayar di kasir' },
  ];

  const getStepIndex = (status?: string) => {
    switch (status) {
      case 'received':  return 0;
      case 'preparing': return 1;
      case 'ready':     return 2;
      case 'completed': return 3;
      default:          return 0;
    }
  };

  const currentStep = getStepIndex(order?.status);
  const isCompleted = order?.status === 'completed';

  return (
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-3xl mx-auto">

      {/* ── Header Banner ── */}
      <div className="bg-white rounded-3xl p-8 border border-[#d4bc8c] shadow-card text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-[#b45309] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
        </div>

        <span className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block mb-1">
          Status Pesanan Realtime
        </span>

        <h1 className="font-serif italic font-bold text-3xl md:text-4xl text-[#b45309] mb-2">
          Pesanan Berhasil!
        </h1>

        <div className="font-mono text-sm font-semibold text-[#5a423a] mb-6">
          Kode Pesanan: <span className="text-[#b45309] font-bold">{decodedOrderCode}</span>
        </div>

        {!isCompleted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3e8d6] border border-[#d4bc8c] text-xs md:text-sm font-medium text-[#b45309]">
            <Clock className="w-4 h-4" />
            <span>Estimasi waktu tunggu: 15–20 menit</span>
          </div>
        )}

        {isCompleted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#dcfce7] border border-[#86efac] text-xs md:text-sm font-semibold text-[#15803d]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pesanan Selesai — Silakan bayar di kasir</span>
          </div>
        )}
      </div>

      {/* ── Live Status Stepper ── */}
      <div className="bg-white rounded-3xl p-8 border border-[#d4bc8c] shadow-card mb-8">
        <h2 className="font-bold text-lg text-[#2a1a15] mb-6">Progres Pesanan</h2>

        <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#e6cdac]">
          {statusSteps.map((step, idx) => {
            const isPassed  = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Stepper Node */}
                <div
                  className={`absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    isPassed
                      ? 'bg-[#15803d] border-[#15803d] text-white shadow-sm'
                      : isCurrent
                      ? 'bg-[#b45309] border-[#b45309] text-white shadow-sm'
                      : 'bg-white border-[#d4bc8c] text-[#9e8d87]'
                  }`}
                >
                  {isPassed ? '✓' : idx + 1}
                </div>

                <div className="ml-3">
                  <h3
                    className={`font-bold text-base transition-colors ${
                      isCurrent ? 'text-[#b45309]' : isPassed ? 'text-[#15803d]' : 'text-[#9e8d87]'
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs text-[#735a52] mt-0.5 font-light">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Order Itemized Summary ── */}
      {order && !isCompleted && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#d4bc8c] shadow-card mb-8 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-[#e6cdac]">
            <span className="font-bold text-base text-[#2a1a15]">Ringkasan Item</span>
            <span className="text-xs font-semibold text-[#b45309]">Meja {order.tableNumber}</span>
          </div>

          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-[#5a423a]">
                <span>
                  {item.qty}x {item.name} {item.spiceLevel ? `(${item.spiceLevel})` : ''}
                </span>
                <span className="font-semibold text-[#2a1a15]">{formatRupiah(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <hr className="border-[#e6cdac]" />

          <div className="flex justify-between items-baseline font-bold text-lg text-[#b45309]">
            <span>Total Pembayaran</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
          <p className="text-[11px] text-[#8c5950] italic text-right">
            * Pembayaran dilakukan di kasir secara manual (Tunai / EDC)
          </p>
        </div>
      )}

      {/* ── Struk Digital (appears automatically when status = completed) ── */}
      {order && isCompleted && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#b45309]/30 shadow-card mb-8">
          {/* Receipt Header */}
          <div className="text-center mb-6 pb-5 border-b border-dashed border-[#d4bc8c]">
            <div className="w-12 h-12 bg-[#f3e8d6] rounded-full flex items-center justify-center mx-auto mb-3 text-[#b45309]">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8c5950] block mb-1">
              Struk Digital
            </span>
            <h2 className="font-serif font-bold text-xl text-[#b45309]">
              {restaurantInfo?.name || 'Warkop Betawa'}
            </h2>
            {restaurantInfo?.address && (
              <p className="text-xs text-[#735a52] mt-0.5">{restaurantInfo.address}</p>
            )}
            <div className="mt-3 space-y-0.5">
              <p className="text-xs font-mono font-semibold text-[#2a1a15]">
                No. Pesanan: <span className="text-[#b45309]">{order.orderCode}</span>
              </p>
              <p className="text-xs text-[#735a52]">Meja {order.tableNumber}</p>
              {order.createdAt && (
                <p className="text-xs text-[#735a52]">{formatDateTime(order.createdAt)}</p>
              )}
            </div>
          </div>

          {/* Itemized List */}
          <div className="space-y-2.5 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-3 text-sm text-[#5a423a]">
                <span className="flex-1">
                  {item.qty}× {item.name}
                  {item.spiceLevel ? (
                    <span className="text-[11px] text-[#9e8d87] ml-1">({item.spiceLevel})</span>
                  ) : null}
                  {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                    <span className="text-[11px] text-[#9e8d87] ml-1">
                      + {item.addOns.map((a: any) => a.label).join(', ')}
                    </span>
                  )}
                </span>
                <span className="font-semibold text-[#2a1a15] tabular-nums whitespace-nowrap">
                  {formatRupiah(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-[#d4bc8c] pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-[#735a52]">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#735a52]">
              <span>Pajak</span>
              <span className="tabular-nums">{formatRupiah(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#735a52]">
              <span>Service Charge</span>
              <span className="tabular-nums">{formatRupiah(order.serviceChargeAmount)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#b45309] mt-3 pt-4 flex justify-between items-baseline">
            <span className="font-bold text-lg text-[#2a1a15]">Total</span>
            <span className="font-bold text-2xl text-[#b45309] tabular-nums">
              {formatRupiah(order.total)}
            </span>
          </div>

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-dashed border-[#d4bc8c] text-center space-y-1">
            <p className="text-xs text-[#8c5950] font-semibold">
              Pembayaran di Kasir (Tunai / EDC)
            </p>
            <p className="text-[11px] text-[#9e8d87] italic">
              Struk ini adalah konfirmasi pesanan digital Anda. Tunjukkan kepada kasir jika diperlukan.
            </p>
            <p className="text-[11px] text-[#9e8d87] mt-1">
              {restaurantInfo?.whatsapp ? `WhatsApp: ${restaurantInfo.whatsapp}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/menu"
          className="flex-1 py-4 bg-[#b45309] hover:bg-[#631c1c] text-white font-medium text-sm rounded-full shadow-md text-center transition-colors flex items-center justify-center gap-2"
        >
          <span>Pesan Lagi (Lihat Menu)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
