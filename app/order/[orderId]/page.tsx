'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Utensils, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { IOrder } from '@/lib/models';

export default function OrderStatusPage() {
  const params = useParams();
  const rawOrderCode = (params?.orderId as string) || '';
  const decodedOrderCode = decodeURIComponent(rawOrderCode);

  const [order, setOrder] = useState<IOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Stepper logic
  const statusSteps = [
    { key: 'received', label: 'Pesanan Diterima', desc: 'Diterima oleh dapur' },
    { key: 'preparing', label: 'Sedang Disiapkan', desc: 'Memasak & meracik sambal' },
    { key: 'ready', label: 'Siap Disajikan', desc: 'Makanan siap diantar ke meja' },
  ];

  const getStepIndex = (status?: string) => {
    switch (status) {
      case 'received':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
      case 'completed':
        return 2;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(order?.status);

  return (
    <main className="min-h-screen pt-8 pb-24 px-4 md:px-8 max-w-3xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-8 border border-[#f5c7bc] shadow-card text-center mb-8 relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-[#7a2323] flex items-center justify-center mx-auto mb-4 shadow-xs">
          <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
        </div>

        <span className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block mb-1">
          Status Pesanan Realtime
        </span>

        <h1 className="font-serif italic font-bold text-3xl md:text-4xl text-[#7a2323] mb-2">
          Pesanan Berhasil!
        </h1>

        <div className="font-mono text-sm font-semibold text-[#5a423a] mb-6">
          Kode Pesanan: <span className="text-[#7a2323] font-bold">{decodedOrderCode}</span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fce9e4] border border-[#f5c7bc] text-xs md:text-sm font-medium text-[#7a2323]">
          <Clock className="w-4 h-4" />
          <span>Estimasi waktu tunggu: 15–20 menit</span>
        </div>
      </div>

      {/* Live Status Stepper */}
      <div className="bg-white rounded-3xl p-8 border border-[#f5c7bc] shadow-card mb-8">
        <h2 className="font-bold text-lg text-[#2a1a15] mb-6">Progres Pesanan</h2>

        <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#f3d9d3]">
          {statusSteps.map((step, idx) => {
            const isPassed = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Stepper Node */}
                <div
                  className={`absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    isPassed || isCurrent
                      ? 'bg-[#7a2323] border-[#7a2323] text-white shadow-sm'
                      : 'bg-white border-[#f5c7bc] text-[#9e8d87]'
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="ml-3">
                  <h3
                    className={`font-bold text-base transition-colors ${
                      isCurrent ? 'text-[#7a2323]' : isPassed ? 'text-[#2a1a15]' : 'text-[#9e8d87]'
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

      {/* Order Itemized Summary Card */}
      {order && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f5c7bc] shadow-card mb-8 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-[#f3d9d3]">
            <span className="font-bold text-base text-[#2a1a15]">Ringkasan Item</span>
            <span className="text-xs font-semibold text-[#7a2323]">Meja {order.tableNumber}</span>
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

          <hr className="border-[#f3d9d3]" />

          <div className="flex justify-between items-baseline font-bold text-lg text-[#7a2323]">
            <span>Total Pembayaran</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
          <p className="text-[11px] text-[#8c5950] italic text-right">
            * Pembayaran dilakukan di kasir secara manual (Tunai / EDC)
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/menu"
          className="flex-1 py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-sm rounded-full shadow-md text-center transition-colors flex items-center justify-center gap-2"
        >
          <span>Pesan Lagi (Lihat Menu)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
