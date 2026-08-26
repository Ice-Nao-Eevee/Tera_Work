'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { addToCart } from '@/lib/store';
import { STATIC_MENU_ITEMS } from '@/lib/staticData';
import { IMenuItem, IAddOn } from '@/lib/models';

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.itemId as string;

  const [item, setItem] = useState<IMenuItem | null>(null);
  const [selectedSpice, setSelectedSpice] = useState<string>('Sedang');
  const [selectedAddOns, setSelectedAddOns] = useState<IAddOn[]>([]);
  const [qty, setQty] = useState<number>(1);
  const [addedMessage, setAddedMessage] = useState<boolean>(false);

  useEffect(() => {
    // Find item from API or initial dataset fallback
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        const found = data.menuItems?.find((m: IMenuItem) => m._id === itemId);
        if (found) {
          setItem(found);
          if (found.spiceLevels && found.spiceLevels.length > 0) {
            setSelectedSpice(found.spiceLevels[1]?.label || found.spiceLevels[0]?.label);
          }
        } else {
          fallbackLocal();
        }
      })
      .catch(() => fallbackLocal());

    function fallbackLocal() {
      const found = STATIC_MENU_ITEMS.find((m) => m._id === itemId) || STATIC_MENU_ITEMS[0];
      setItem(found);
      if (found.spiceLevels && found.spiceLevels.length > 0) {
        setSelectedSpice(found.spiceLevels[1]?.label || found.spiceLevels[0]?.label);
      }
    }
  }, [itemId]);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#7a2323] font-medium">
        Memuat detail hidangan...
      </div>
    );
  }

  // Calculate dynamic live total price
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const unitPrice = item.price + addOnsTotal;
  const liveTotal = unitPrice * qty;

  const toggleAddOn = (addOn: IAddOn) => {
    if (selectedAddOns.some((a) => a.label === addOn.label)) {
      setSelectedAddOns(selectedAddOns.filter((a) => a.label !== addOn.label));
    } else {
      setSelectedAddOns([...selectedAddOns, addOn]);
    }
  };

  const handleAddToCart = () => {
    addToCart(item, qty, selectedSpice, selectedAddOns);
    setAddedMessage(true);
    setTimeout(() => {
      setAddedMessage(false);
      router.push('/menu');
    }, 800);
  };

  return (
    <main className="min-h-screen pt-6 pb-24 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Top Back Link matching desktop-item-detail screenshot */}
      <Link
        href="/menu"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#7a2323] hover:underline mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Menu Utama</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Product Image Left */}
        <div className="lg:col-span-6">
          <div className="relative h-80 md:h-[450px] w-full rounded-3xl overflow-hidden shadow-soft border border-[#f5c7bc] bg-white">
            <Image
              src={item.photoUrl}
              alt={item.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        {/* Details & Options Right */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <h1 className="font-serif italic font-bold text-3xl md:text-4xl text-[#2a1a15]">
              {item.name}
            </h1>
            <div className="font-bold text-2xl text-[#7a2323] mt-2">
              {formatRupiah(item.price)}
            </div>
            <p className="text-sm text-[#614a42] mt-3 leading-relaxed font-light">
              {item.description}
            </p>
          </div>

          <hr className="border-[#f3d9d3]" />

          {/* Spice Level Selector */}
          {item.spiceLevels && item.spiceLevels.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block">
                Pilih Tingkat Kepedasan
              </label>
              <div className="flex flex-wrap gap-3">
                {item.spiceLevels.map((lvl) => {
                  const isSelected = selectedSpice === lvl.label;
                  return (
                    <button
                      key={lvl.label}
                      type="button"
                      onClick={() => setSelectedSpice(lvl.label)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                        isSelected
                          ? 'bg-[#7a2323] text-white border-[#7a2323] shadow-sm'
                          : 'bg-white text-[#5a423a] border-[#f5c7bc] hover:bg-[#fce9e4]'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons Multi-Select Checkboxes */}
          {item.addOns && item.addOns.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest font-bold text-[#8c5950] block">
                Tambahan (Add-Ons)
              </label>
              <div className="space-y-2.5">
                {item.addOns.map((addOn) => {
                  const isChecked = selectedAddOns.some((a) => a.label === addOn.label);
                  return (
                    <label
                      key={addOn.label}
                      onClick={() => toggleAddOn(addOn)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#fce9e4] border-[#7a2323] text-[#7a2323]'
                          : 'bg-white border-[#f5c7bc] text-[#2a1a15] hover:bg-[#fdf1ee]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-[#7a2323] border-[#7a2323] text-white' : 'border-[#9e8d87] bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-medium">{addOn.label}</span>
                      </div>
                      <span className="text-sm font-bold text-[#7a2323]">
                        +{formatRupiah(addOn.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper & Live Price CTA Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            {/* Stepper */}
            <div className="flex items-center bg-[#fce9e4] border border-[#f5c7bc] rounded-full p-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full bg-white text-[#7a2323] flex items-center justify-center hover:bg-[#f8dbd4] transition-colors"
                aria-label="Kurangi Jumlah"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="w-12 text-center font-bold text-[#7a2323] text-base">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full bg-[#7a2323] text-white flex items-center justify-center hover:bg-[#631c1c] transition-colors"
                aria-label="Tambah Jumlah"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 w-full py-4 bg-[#7a2323] hover:bg-[#631c1c] text-white font-medium text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>
                {addedMessage ? 'Tersimpan!' : `Masukkan ke Keranjang — ${formatRupiah(liveTotal)}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
