import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Check, ExternalLink, Utensils } from 'lucide-react';
import { IMenuItem } from '@/lib/types';
import { addToCart } from '@/lib/store';
import { formatRupiah } from '@/lib/format';

interface ProductCardProps {
  productName: string;
  url: string;
  menuItems: IMenuItem[];
  onSelectMenu?: () => void;
}

export default function AIProductCard({
  productName,
  url,
  menuItems,
  onSelectMenu,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);

  // Extract ID or Search term from url
  // Handles: /menu/{id}, /menu?item={id}, or /menu?search={name}
  let targetId = '';
  let cleanSearch = productName.toLowerCase().trim();

  if (url.includes('/menu/')) {
    targetId = url.split('/menu/')[1]?.split('?')[0]?.trim() || '';
  } else if (url.includes('item=')) {
    targetId = url.split('item=')[1]?.split('&')[0]?.trim() || '';
  } else if (url.includes('search=')) {
    cleanSearch = decodeURIComponent(url.split('search=')[1].replace(/\+/g, ' ')).toLowerCase().trim();
  }

  // Find product by id first, then by name
  const item = menuItems.find((m) => {
    if (targetId && (m.id === targetId || m._id === targetId)) return true;
    const mName = m.name.toLowerCase().trim();
    return (
      mName === cleanSearch ||
      mName.includes(cleanSearch) ||
      cleanSearch.includes(mName)
    );
  });

  const resolvedId = item?.id || item?._id || targetId;
  const detailUrl = resolvedId ? `/menu/${resolvedId}` : url;

  const displayName = item ? item.name : productName;
  const displayPrice = item ? formatRupiah(item.price) : '';
  const displayDesc = item?.description || 'Menu pilihan spesial dari Warkop Betawa.';
  const displayPhoto =
    item?.photoUrl ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (item) {
      addToCart(item, 1);
    } else {
      // Fallback pseudo-item if item not in DB yet
      const fallbackItem: IMenuItem = {
        id: resolvedId || `gen-${cleanSearch}`,
        name: displayName,
        description: displayDesc,
        price: 25000,
        category: 'makanan',
        photoUrl: displayPhoto,
        spiceLevels: [{ label: 'Sedang', priceModifier: 0 }],
        addOns: [],
        isActive: true,
      };
      addToCart(fallbackItem, 1);
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-amber-200/80 bg-white/95 shadow-sm hover:shadow-md transition-all overflow-hidden text-left">
      <div className="flex flex-col sm:flex-row">
        {/* Left: Product Image */}
        <div className="relative w-full sm:w-28 sm:min-w-[112px] h-28 sm:h-auto bg-amber-50 shrink-0 overflow-hidden">
          {displayPhoto ? (
            <Image
              src={displayPhoto}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 100vw, 120px"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-300">
              <Utensils className="w-8 h-8" />
            </div>
          )}
          {item?.badge && item.badge !== 'none' && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
              {item.badge === 'best_seller'
                ? 'Best Seller'
                : item.badge === 'chefs_choice'
                ? "Chef's"
                : 'Spesial'}
            </span>
          )}
        </div>

        {/* Right: Product Details & Action Buttons */}
        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-1.5 mb-1">
              <h4 className="font-semibold text-xs text-[#2a1a15] truncate" title={displayName}>
                {displayName}
              </h4>
              {displayPrice && (
                <span className="font-bold text-xs text-amber-700 shrink-0">
                  {displayPrice}
                </span>
              )}
            </div>

            {/* Product Description Beside Product Image */}
            <p className="text-[11px] text-[#6b584f] line-clamp-2 leading-relaxed mb-2.5">
              {displayDesc}
            </p>
          </div>

          {/* Action Buttons: Add to Cart + View Product */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-amber-100">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all shadow-xs ${
                added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Ditambahkan</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Keranjang</span>
                </>
              )}
            </button>

            <Link
              href={detailUrl}
              onClick={() => onSelectMenu?.()}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <span>Lihat</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
