'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  ShoppingCart,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Heart,
  Sparkles,
  Clock,
  ArrowRight,
  Utensils,
  UtensilsCrossed,
  LayoutGrid,
  GlassWater,
  Croissant,
  Cookie,
  Coffee,
  Menu,
  X,
  Tag,
  Star,
  CupSoda,
  CheckCircle2,
  Calendar,
  Users,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import {
  getCartItems,
  addToCart,
  storeEvents,
  searchEvents,
  uiEvents,
  saveManualTableNumber,
  getManualTableNumber,
  CartItem,
} from '@/lib/store';
import { STATIC_MENU_ITEMS, STATIC_CATEGORIES } from '@/lib/staticData';
import { IMenuItem, ICategory } from '@/lib/types';
import FloatingCart from '@/components/FloatingCart';
import AIChatPanel from '@/components/AIChatPanel';

export default function MenuPage() {
  const router = useRouter();

  // ── State: Data & Filter ──
  const [categories, setCategories] = useState<ICategory[]>(STATIC_CATEGORIES);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // ── State: Cart Drawer & AI Assistant ──
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);

  // ── State: Interactive UI ──
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'item-8': true, // Es Kopi Senja favorit default
    'item-12': true, // V60 Senja Reserve favorit default
  });
  const [activePromoIndex, setActivePromoIndex] = useState<number>(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState<boolean>(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [showAllMenuSection, setShowAllMenuSection] = useState<boolean>(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize cart & AI with uiEvents and window custom events
  useEffect(() => {
    const unsubCart = uiEvents.subscribeCart(() => setIsCartOpen(true));
    const unsubAi = uiEvents.subscribeAi(() => setIsAiOpen((prev) => !prev));
    const handleOpenCart = () => setIsCartOpen(true);
    const handleToggleAi = () => setIsAiOpen((prev) => !prev);
    window.addEventListener('wkb:open-cart', handleOpenCart);
    window.addEventListener('wkb:toggle-ai', handleToggleAi);
    return () => {
      unsubCart();
      unsubAi();
      window.removeEventListener('wkb:open-cart', handleOpenCart);
      window.removeEventListener('wkb:toggle-ai', handleToggleAi);
    };
  }, []);

  // ── Derived Cart Values ──
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + (item.qty || 0), 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0), [cartItems]);

  // Auto-dismiss toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Load menu items from API or fallback to static data
  useEffect(() => {
    setIsMounted(true);
    setSelectedTableNumber(getManualTableNumber() || 1);

    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
          // Merge to ensure coffee & pastry items are always available even if DB is partial
          const dbItemNames = new Set(data.menuItems.map((m: any) => m.name.toLowerCase()));
          const missingStatic = STATIC_MENU_ITEMS.filter((s) => !dbItemNames.has(s.name.toLowerCase()));
          setMenuItems([...data.menuItems, ...missingStatic]);
        }
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {
        console.log('Using static default menu items');
      });
  }, []);

  // Synchronize local cart state & search query
  const refreshCart = useCallback(() => {
    setCartItems(getCartItems());
  }, []);

  useEffect(() => {
    refreshCart();
    const unsubscribeCart = storeEvents.subscribe(refreshCart);
    const unsubscribeSearch = searchEvents.subscribe((q) => setSearchQuery(q));
    const handleCartUpdated = () => refreshCart();
    window.addEventListener('wkb:cart-updated', handleCartUpdated);
    window.addEventListener('storage', handleCartUpdated);
    return () => {
      unsubscribeCart();
      unsubscribeSearch();
      window.removeEventListener('wkb:cart-updated', handleCartUpdated);
      window.removeEventListener('storage', handleCartUpdated);
    };
  }, [refreshCart]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    searchEvents.setQuery(q);
  };

  const handleSelectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setIsMobileSidebarOpen(false);
    if (slug !== 'semua') {
      setShowAllMenuSection(true);
    }
  };

  // Filter menu items based on category and search query
  const filteredItems = useMemo(() => {
    return (menuItems || []).filter((item) => {
      if (!item) return false;
      const cat = String(item.category || '').toLowerCase();
      const name = String(item.name || '').toLowerCase();
      const desc = String(item.description || '').toLowerCase();
      const sel = String(selectedCategory || 'semua').toLowerCase();
      const q = String(searchQuery || '').toLowerCase();

      let matchesCategory = false;
      if (sel === 'semua' || sel === 'menu-kami') {
        matchesCategory = true;
      } else if (sel === 'makanan') {
        // Strict makanan: only genuine food dishes. Excludes drinks, coffees, teas, snacks, pastries, and bundles
        const isDrink =
          cat === 'minuman' ||
          cat === 'coffee' ||
          cat === 'kopi' ||
          cat === 'tea' ||
          cat === 'non-coffee' ||
          name.includes('kopi') ||
          name.includes('teh') ||
          name.includes('tea') ||
          name.includes('latte') ||
          name.includes('espresso') ||
          name.includes('cappuccino') ||
          name.includes('v60') ||
          name.includes('brew') ||
          name.includes('matcha') ||
          name.includes('macchiato') ||
          name.includes('soda') ||
          name.includes('juice') ||
          name.includes('jus') ||
          desc.includes('matcha') ||
          desc.includes('espresso') ||
          desc.includes('kopi');
        const isSnack =
          cat === 'cemilan' ||
          cat === 'dessert' ||
          cat === 'pastry' ||
          cat === 'snack' ||
          name.includes('croissant') ||
          name.includes('chocolat') ||
          name.includes('pisang') ||
          name.includes('kentang') ||
          desc.includes('croissant') ||
          desc.includes('chocolat');
        const isBundle =
          cat === 'paket' ||
          cat === 'bundle' ||
          name.includes('paket');

        if (isDrink || isSnack || isBundle) {
          matchesCategory = false;
        } else {
          matchesCategory =
            cat === 'makanan' ||
            name.includes('nasi') ||
            name.includes('sate') ||
            name.includes('soto') ||
            name.includes('gado') ||
            name.includes('rendang') ||
            name.includes('ayam') ||
            name.includes('mie') ||
            name.includes('daging');
        }
      } else if (sel === 'minuman') {
        // Strict minuman: excludes food dishes, pastries/snacks, and bundles
        const isFood =
          cat === 'makanan' ||
          name.includes('nasi') ||
          name.includes('sate') ||
          name.includes('rendang') ||
          name.includes('soto') ||
          name.includes('mie') ||
          name.includes('ayam');
        const isSnack =
          cat === 'cemilan' ||
          cat === 'dessert' ||
          cat === 'pastry' ||
          cat === 'snack' ||
          name.includes('croissant') ||
          name.includes('chocolat');
        const isBundle =
          cat === 'paket' ||
          cat === 'bundle' ||
          name.includes('paket');

        if (isFood || isSnack || isBundle) {
          matchesCategory = false;
        } else {
          matchesCategory =
            cat === 'minuman' ||
            cat === 'coffee' ||
            cat === 'kopi' ||
            cat === 'tea' ||
            cat === 'non-coffee' ||
            name.includes('kopi') ||
            name.includes('teh') ||
            name.includes('tea') ||
            name.includes('latte') ||
            name.includes('espresso') ||
            name.includes('cappuccino') ||
            name.includes('v60') ||
            name.includes('brew') ||
            name.includes('macchiato') ||
            name.includes('matcha');
        }
      } else if (sel === 'coffee' || sel === 'kopi') {
        // Strict coffee: excludes matcha, tea, food, pastry, snack, bundles
        if (
          name.includes('matcha') ||
          name.includes('teh') ||
          cat === 'makanan' ||
          cat === 'cemilan' ||
          cat === 'dessert' ||
          cat === 'pastry' ||
          cat === 'snack' ||
          cat === 'paket' ||
          name.includes('paket')
        ) {
          matchesCategory = false;
        } else {
          matchesCategory =
            name.includes('kopi') ||
            name.includes('espresso') ||
            name.includes('cappuccino') ||
            name.includes('v60') ||
            name.includes('macchiato') ||
            name.includes('brew') ||
            cat === 'coffee' ||
            cat === 'kopi';
        }
      } else if (sel === 'non-coffee' || sel === 'non coffee') {
        // Strict non-coffee: matcha, chocolate, milk
        if (
          name.includes('kopi') ||
          name.includes('espresso') ||
          name.includes('cappuccino') ||
          name.includes('v60') ||
          name.includes('brew') ||
          cat === 'makanan' ||
          cat === 'paket' ||
          name.includes('paket')
        ) {
          matchesCategory = false;
        } else {
          matchesCategory =
            cat === 'non-coffee' ||
            name.includes('matcha') ||
            name.includes('chocolate') ||
            name.includes('susu') ||
            name.includes('teh');
        }
      } else if (sel === 'tea' || sel === 'teh') {
        matchesCategory =
          (cat === 'tea' || name.includes('tea') || name.includes('teh')) &&
          !name.includes('kopi') &&
          cat !== 'paket' &&
          !name.includes('paket');
      } else if (sel === 'pastry') {
        matchesCategory =
          (cat === 'pastry' || name.includes('croissant') || name.includes('chocolat')) &&
          cat !== 'minuman' &&
          cat !== 'paket' &&
          !name.includes('paket');
      } else if (sel === 'snack' || sel === 'cemilan') {
        // Strict snack & cemilan: excludes drinks, heavy food dishes, and bundles
        const isDrink =
          cat === 'minuman' ||
          cat === 'coffee' ||
          cat === 'kopi' ||
          cat === 'tea' ||
          name.includes('kopi') ||
          name.includes('teh') ||
          name.includes('latte') ||
          name.includes('matcha');
        const isFood =
          cat === 'makanan' ||
          name.includes('nasi') ||
          name.includes('sate') ||
          name.includes('soto') ||
          name.includes('rendang') ||
          name.includes('mie') ||
          name.includes('ayam');
        const isBundle =
          cat === 'paket' ||
          cat === 'bundle' ||
          name.includes('paket');

        if (isDrink || isFood || isBundle) {
          matchesCategory = false;
        } else {
          matchesCategory =
            cat === 'cemilan' ||
            cat === 'snack' ||
            cat === 'dessert' ||
            cat === 'pastry' ||
            name.includes('pisang') ||
            name.includes('croissant') ||
            name.includes('chocolat') ||
            name.includes('kentang');
        }
      } else {
        matchesCategory = cat === sel || cat.includes(sel);
      }

      const matchesSearch = !q || name.includes(q) || desc.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Quick Add Item to Cart
  const handleQuickAdd = (item: IMenuItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const safeItem: IMenuItem = {
      ...item,
      name: item.name || (item as any).title || 'Menu Warkop',
    };
    const defaultSpice = safeItem.spiceLevels && safeItem.spiceLevels.length > 0 ? 'Sedang' : undefined;
    const updatedCart = addToCart(safeItem, 1, defaultSpice, []);
    setCartItems([...updatedCart]);

    const itemId = safeItem.id || safeItem._id || '';
    setJustAddedId(itemId);
    showToast(`"${safeItem.name}" berhasil ditambahkan ke keranjang!`);

    setTimeout(() => {
      setJustAddedId((curr) => (curr === itemId ? null : curr));
    }, 900);
  };

  // Toggle favorite heart
  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = !prev[itemId];
      showToast(next ? 'Disimpan ke menu favorit ❤️' : 'Dihapus dari favorit');
      return { ...prev, [itemId]: next };
    });
  };

  // Quick Promo Claim
  const handleClaimPromo = (promoTitle: string, code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    try {
      sessionStorage.setItem('wkb_selected_coupon', code);
    } catch (_) {}
    showToast(`Voucher "${promoTitle}" (Kode: ${code}) berhasil diklaim!`);
  };

  // Save manual table selection
  const handleConfirmReservation = (tableNum: number) => {
    saveManualTableNumber(tableNum);
    setSelectedTableNumber(tableNum);
    setIsReservationModalOpen(false);
    showToast(`Meja #${tableNum} berhasil dipilih untuk pesanan Anda!`);
  };

  // ── Promos Data (matching Image 1) ──
  const promoSlides = [
    {
      id: 'promo-coffee-break',
      badge: 'DISKON 20%',
      time: '14:00 - 17:00',
      title: 'Coffee Break',
      subtitle: 'Diskon 20% untuk semua racikan espresso & latte sore ini',
      code: 'SENJA20',
      bgImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'promo-morning-combo',
      badge: 'HEMAT',
      time: '07:00 - 11:00',
      title: 'Morning Combo',
      subtitle: 'Kopi + Pastry hangat mulai Rp 25.000 untuk awali harimu',
      code: 'PAGIHEMAT',
      bgImage: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'promo-sunset-blend',
      badge: 'BARU',
      time: 'All Day',
      title: 'Sunset Blend',
      subtitle: 'Racikan spesial sore hari dengan sentuhan aroma citrus segar',
      code: 'SUNSETBARU',
      bgImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // ── Curated Favorite Menu Items (matching Image 1) ──
  const favoriteItems: (IMenuItem & { rating: string; sold: string })[] = [
    {
      id: 'item-8',
      _id: 'item-8',
      name: 'Es Kopi Senja',
      description: 'Double espresso susu gula aren kental racikan istimewa warkop...',
      price: 18000,
      category: 'minuman',
      badge: 'best_seller',
      photoUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
      rating: '4.9',
      sold: '1.2k terjual',
    },
    {
      id: 'item-9',
      _id: 'item-9',
      name: 'Cappuccino Klasik',
      description: 'Espresso klasik dengan foam lembut dan taburan cocoa pilihan...',
      price: 22000,
      category: 'minuman',
      badge: 'kopi',
      photoUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
      rating: '4.8',
      sold: '850 terjual',
    },
    {
      id: 'item-10',
      _id: 'item-10',
      name: 'Matcha Latte',
      description: 'Pure uji matcha berpadu susu segar gurih creamy lembut...',
      price: 24000,
      category: 'minuman',
      badge: 'non-coffee',
      photoUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
      rating: '4.9',
      sold: '940 terjual',
    },
    {
      id: 'item-11',
      _id: 'item-11',
      name: 'Croissant Almond',
      description: 'Flaky renyah lapis butter dengan limpahan roasted almond...',
      price: 26000,
      category: 'cemilan',
      badge: 'pastry',
      photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
      rating: '4.7',
      sold: '620 terjual',
    },
  ];

  // ── Curated Recommendations (matching Image 1) ──
  const recommendationItems = [
    {
      id: 'item-12',
      _id: 'item-12',
      tag: 'MANUAL BREW ORIGIN',
      name: 'V60 Senja Reserve',
      badge: 'SIGNATURE',
      price: 28000,
      category: 'minuman',
      photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
    {
      id: 'item-13',
      _id: 'item-13',
      tag: 'SWEET & CREAMY BLEND',
      name: 'Caramel Macchiato',
      badge: 'FAVORITE',
      price: 26000,
      category: 'minuman',
      photoUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
    {
      id: 'item-14',
      _id: 'item-14',
      tag: 'SLOW STEEPED 18 HOURS',
      name: 'Cold Brew Citrus',
      badge: 'REFRESHING',
      price: 25000,
      category: 'minuman',
      photoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
    {
      id: 'item-15',
      _id: 'item-15',
      tag: 'BELGIAN DARK CHOCOLATE',
      name: 'Pain Au Chocolat',
      badge: 'ARTISAN',
      price: 24000,
      category: 'cemilan',
      photoUrl: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=800&q=80',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
  ];

  // ── Package Bundles (matching Image 1) ──
  const bundlePackages = [
    {
      id: 'item-16',
      _id: 'item-16',
      name: 'Paket Semangat Pagi',
      title: 'Paket Semangat Pagi',
      saveBadge: 'Hemat Rp 8.000',
      subtitle: 'Kopi Senja + Butter Croissant',
      originalPrice: 40000,
      price: 32000,
      photoUrl: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=400&q=80',
      category: 'paket',
      description: 'Paduan pas kopi susu aren hangat dan renyahnya croissant mentega premium.',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
    {
      id: 'item-17',
      _id: 'item-17',
      name: 'Paket Teman Kerja',
      title: 'Paket Teman Kerja',
      saveBadge: 'Hemat Rp 15.000',
      subtitle: '2x Kopi Senja + Snack Mix',
      originalPrice: 70000,
      price: 55000,
      photoUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&q=80',
      category: 'paket',
      description: 'Dua gelas es kopi senja segar ditambah camilan renyah untuk teman produktif.',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
    {
      id: 'item-18',
      _id: 'item-18',
      name: 'Paket Sore Santai',
      title: 'Paket Sore Santai',
      saveBadge: 'Hemat Rp 7.000',
      subtitle: 'Matcha Latte + Pain Au Chocolat',
      originalPrice: 45000,
      price: 38000,
      photoUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
      category: 'paket',
      description: 'Kenikmatan matcha latte autentik dengan lumeran cokelat pastry Belgia.',
      spiceLevels: [],
      addOns: [],
      isActive: true,
    },
  ];

  // ── Unified Category Items (Identical for Sidebar Navigation and Category Filter Capsule) ──
  const quickCategories = [
    { slug: 'semua', label: 'Semua', Icon: UtensilsCrossed },
    { slug: 'makanan', label: 'Makanan', Icon: Utensils },
    { slug: 'minuman', label: 'Minuman', Icon: CupSoda },
    { slug: 'cemilan', label: 'Cemilan', Icon: Croissant },
    { slug: 'kopi', label: 'Kopi', Icon: Coffee },
  ];

  // Sidebar navigation items (Synchronized 1:1 with Category Filter)
  const sidebarNavCategories = quickCategories;

  // Check if we should display the full Gambar 1 showcase mode (when "semua" is selected and no search)
  const isShowcaseMode =
    (selectedCategory === 'semua' || selectedCategory === 'menu-kami') &&
    !searchQuery.trim();

  const getCategoryTitle = (slug: string) => {
    switch (slug) {
      case 'makanan':
        return 'Koleksi Makanan Khas Betawi';
      case 'minuman':
        return 'Koleksi Minuman Segar';
      case 'coffee':
      case 'kopi':
        return 'Koleksi Kopi Nusantara';
      case 'cemilan':
        return 'Koleksi Cemilan & Pastry';
      case 'non-coffee':
        return 'Koleksi Minuman Non-Coffee';
      case 'tea':
        return 'Koleksi Teh Nusantara';
      case 'pastry':
        return 'Koleksi Pastry Hangat';
      case 'snack':
        return 'Koleksi Snack & Camilan';
      default:
        return 'Koleksi Hidangan Pilihan';
    }
  };

  const getCategorySubtitle = (slug: string) => {
    switch (slug) {
      case 'makanan':
        return 'Santapan lezat dengan bumbu rempah autentik warisan Betawi tempo 1984.';
      case 'minuman':
        return 'Racikan kopi segar, teh wangi, dan aneka minuman pelepas dahaga.';
      case 'coffee':
      case 'kopi':
        return 'Ekstraksi espresso mantap dan seduhan biji kopi arabika pilihan barista.';
      case 'cemilan':
        return 'Kudapan manis legit dan pastry renyah mentega untuk menemani obrolan santai.';
      case 'non-coffee':
        return 'Kenikmatan matcha murni dan racikan susu segar gurih tanpa kafein.';
      case 'tea':
        return 'Seduhan daun teh harum dengan rasa manis pas menyegarkan jiwa.';
      case 'pastry':
        return 'Pastry renyah mentega Prancis dipanggang hangat fresh setiap hari.';
      case 'snack':
        return 'Camilan gurih renyah teman setia seduhan kopi favoritmu.';
      default:
        return 'Pilihan hidangan kurasi terbaik siap disajikan hangat.';
    }
  };

  return (
    <div className="min-h-screen bg-[#faf5ee] text-[#2a1a15] font-sans antialiased flex flex-col selection:bg-[#b45309] selection:text-white">
      {/* ══════════════════════════════════════════════════════════════════
          MOBILE TOP NAVBAR (Only on small screens < lg)
      ══════════════════════════════════════════════════════════════════ */}
      <header suppressHydrationWarning className="lg:hidden sticky top-0 z-40 bg-[#1c110b] text-[#f7f2ea] px-4 py-3 flex items-center justify-between border-b border-[#2e1b12] shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Buka Menu Navigasi"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#f7f2ea] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/warkop-betawa-logo.png"
              alt="Logo Warkop Betawa"
              className="w-7 h-7 rounded-full border border-amber-500/40 object-cover"
            />
            <span className="font-serif italic font-bold text-base text-amber-200">
              Warkop Betawa
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Sparkle */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsAiOpen((prev) => !prev)}
            aria-label="Tanya AI Asisten"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Cart Icon */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCartOpen(true)}
            aria-label="Buka Keranjang"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white relative transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            {isMounted && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#b45309] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#1c110b]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR (Desktop fixed & Mobile Slide-in Drawer)
      ══════════════════════════════════════════════════════════════════ */}
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        suppressHydrationWarning
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 xl:w-72 bg-[#1c110b] text-[#e8ded3] border-r border-[#2e1b12] flex flex-col justify-between p-5 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Top greeting + AI & Mobile Close */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#cbb59b] font-medium tracking-wide flex items-center gap-1.5">
              Selamat datang 👋
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setIsAiOpen((prev) => !prev)}
                title="Tanya Asisten AI Warkop Betawa"
                className="p-1.5 rounded-full bg-white/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setIsMobileSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#cbb59b] cursor-pointer"
                aria-label="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 pb-1 border-b border-[#2e1b12]">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#b45309]/50 shadow-md bg-[#2a170f] shrink-0">
              <img
                src="/warkop-betawa-logo.png"
                alt="Warkop Betawa"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-serif italic font-extrabold text-sm sm:text-base text-[#fdf8f2] tracking-wide leading-tight">
                WARKOP BETAWA
              </h2>
              <p className="text-[9px] text-[#b89d82] tracking-[0.2em] font-semibold uppercase mt-0.5">
                KOPI - MUSIK - INSPIRASI
              </p>
            </div>
          </div>

          {/* Search Bar in Sidebar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8c7e75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              suppressHydrationWarning
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari kopi, makanan, cemilan..."
              className="w-full pl-9 pr-8 py-2 bg-white text-xs text-[#1c110b] placeholder-[#8c7e75] rounded-full focus:outline-none focus:ring-2 focus:ring-[#b45309] shadow-sm font-medium"
            />
            {searchQuery && (
              <button
                suppressHydrationWarning
                onClick={() => {
                  setSearchQuery('');
                  searchEvents.setQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Vertical Navigation */}
          <nav className="space-y-1.5 pt-1">
            {sidebarNavCategories.map((cat) => {
              const IconComponent = cat.Icon;
              const isSelected =
                selectedCategory === cat.slug ||
                (cat.slug === 'semua' && (selectedCategory === 'semua' || selectedCategory === 'menu-kami')) ||
                ((cat.slug === 'kopi' || cat.slug === 'coffee') && (selectedCategory === 'coffee' || selectedCategory === 'kopi')) ||
                (cat.slug === 'cemilan' && (selectedCategory === 'cemilan' || selectedCategory === 'pastry' || selectedCategory === 'snack'));

              return (
                <button
                  suppressHydrationWarning
                  key={cat.slug}
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#1c110b] shadow-md font-bold'
                      : 'text-[#d6c7b7] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <IconComponent
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isSelected ? 'text-[#1c110b] stroke-[2.2]' : 'text-[#d6c7b7] stroke-[1.8]'
                    }`}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Voucher Banner Widget */}
          <div className="bg-[#2a170f] border border-[#44281a] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-[#f5ebe1] font-medium">Ada 3 voucher aktif</span>
            </div>
            <button
              suppressHydrationWarning
              onClick={() => setIsVoucherModalOpen(true)}
              className="text-xs font-bold text-[#e59866] hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <span>Lihat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar Bottom: Real-Time Cart Pill Button */}
        <div className="pt-4 mt-6 border-t border-[#2e1b12]">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-white hover:bg-[#fafafa] text-[#1c110b] py-2 px-4 rounded-full shadow-lg flex items-center justify-between transition-transform active:scale-98 border border-white/20 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#1c110b]" />
              <span className="font-bold text-xs sm:text-sm text-[#1c110b]" suppressHydrationWarning>
                {isMounted && cartTotal > 0 ? formatRupiah(cartTotal) : 'Rp 0'}
              </span>
            </div>

            <div className="w-6 h-6 rounded-full bg-[#1c110b] text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:bg-[#b45309] transition-colors" suppressHydrationWarning>
              {isMounted ? cartCount : 0}
            </div>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA (Right of the sidebar on Desktop)
      ══════════════════════════════════════════════════════════════════ */}
      <main className="lg:pl-64 xl:pl-72 flex-1 w-full bg-[#faf5ee]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-9">

          {/* ── 1. HERO / BANNER SECTION (matching Image 1) ── */}
          <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#2c170d] via-[#22120a] to-[#170a04] text-white p-4 sm:p-8 md:p-11 shadow-2xl border border-[#3b2014]">
            {/* Background subtle coffee ambient lighting */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-600/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#c05621]/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col-reverse md:flex-row items-center justify-between gap-4 sm:gap-8 md:gap-12">
              {/* Left Text & CTA */}
              <div className="max-w-xl text-left space-y-2.5 sm:space-y-4">
                <h1 className="font-serif font-extrabold text-2xl pr-24 min-h-[4.5rem] sm:pr-0 sm:min-h-0 sm:text-4xl lg:text-5xl leading-[1.15] tracking-tight">
                  <span className="text-[#fdf8f4] block">Rasa Segar.</span>
                  <span className="italic text-[#e59866] font-serif font-bold">Racikan Istimewa.</span>
                </h1>

                <p className="text-[11px] line-clamp-3 sm:line-clamp-none sm:text-sm text-[#d6c5b6] leading-relaxed max-w-lg font-light">
                  Menghidangkan kembali tradisi kelezatan sepasang tubuh dan masakan mantap Betawi tempo 1984, diolah segar dengan rempah nusantara pilihan berkualitas kami.
                </p>

                <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                  <a
                    href="#menu-favorit"
                    className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-[#a34415] hover:bg-[#8f390e] text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <span>Pesan Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    suppressHydrationWarning
                    onClick={() => setIsReservationModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-5 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 text-[#f7f2ea] border border-white/20 text-xs sm:text-sm font-semibold transition-all backdrop-blur-xs cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>Reservasi Meja</span>
                  </button>
                </div>
              </div>

              {/* Right Circular Food Showcase Image */}
              <div className="absolute top-0 right-0 md:relative shrink-0 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden border-4 border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.65)] relative group bg-[#2a170f]">
                  <img
                    src="https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80"
                    alt="Sajian Istimewa Warkop Betawa"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. QUICK CATEGORY ICONS (Floating Centered Capsule, matching Gambar 1) ── */}
          <section className="flex justify-center -mt-6 sm:-mt-8 relative z-20">
            <div className="bg-white rounded-full py-2.5 px-6 sm:px-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#ede3d7] flex items-center gap-6 sm:gap-9 overflow-x-auto scrollbar-none max-w-full">
              {quickCategories.map((item) => {
                const IconComponent = item.Icon;
                const isActive =
                  selectedCategory === item.slug ||
                  (item.slug === 'semua' && (selectedCategory === 'semua' || selectedCategory === 'menu-kami')) ||
                  ((item.slug === 'kopi' || item.slug === 'coffee') && (selectedCategory === 'coffee' || selectedCategory === 'kopi')) ||
                  (item.slug === 'cemilan' && (selectedCategory === 'cemilan' || selectedCategory === 'pastry' || selectedCategory === 'snack'));

                return (
                  <button
                    suppressHydrationWarning
                    key={item.slug}
                    onClick={() => handleSelectCategory(item.slug)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group transition-transform active:scale-95 cursor-pointer"
                  >
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? 'bg-[#faede3] text-[#78350f] shadow-xs scale-105 border border-[#e8c8b5]'
                          : 'bg-[#fbf6f0] text-[#8c786a] hover:bg-[#f5eae0] hover:text-[#78350f] border border-transparent'
                      }`}
                    >
                      <IconComponent
                        className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                          isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'
                        }`}
                      />
                    </div>

                    <span
                      className={`text-[11px] sm:text-xs font-semibold tracking-tight transition-colors ${
                        isActive ? 'text-[#5c3d2e] font-bold' : 'text-[#786b62] group-hover:text-[#5c3d2e]'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Active indicator dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        isActive ? 'bg-[#9a3412] scale-100 opacity-100' : 'bg-transparent scale-0 opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 3. CONDITIONAL MAIN CONTENT: SHOWCASE (Gambar 1) vs DEDICATED CATEGORY VIEW ── */}
          {isShowcaseMode ? (
            <>
              {/* ── 3. SECTION: SPECIAL PROMO (Promo Minggu Ini, matching Image 1) ── */}
              <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-[#c05621] uppercase tracking-widest block">
                  SPECIAL PROMO
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#24130a] tracking-tight">
                  Promo Minggu Ini
                </h2>
                <p className="text-xs sm:text-sm text-[#736055] mt-0.5">
                  Penawaran spesial kurasi barista untuk temani setiap jedamu
                </p>
              </div>

              <Link
                href="/promo"
                className="text-xs sm:text-sm font-semibold text-[#b45309] hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Lihat Semua Voucher</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 3 Promo Cards Grid */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-4 md:mx-0 md:px-0 md:pt-0 md:pb-0 md:overflow-visible">
              {promoSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="relative isolate w-[85%] min-w-[85%] shrink-0 snap-center md:w-auto md:min-w-0 md:shrink rounded-3xl overflow-hidden min-h-[150px] sm:min-h-[190px] p-5 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border border-white/20 bg-[#1c110b]"
                >
                  {/* Background Photo with dark roast overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={slide.bgImage}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/35" />
                  </div>

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-white/95 text-[#24130a] shadow-xs">
                      {slide.badge}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 text-[#eeddc5] border border-white/20 backdrop-blur-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-300" />
                      {slide.time}
                    </span>
                  </div>

                  {/* Bottom Text & Action */}
                  <div className="relative z-10 flex items-end justify-between gap-3 pt-4">
                    <div className="text-white space-y-1">
                      <h3 className="font-bold text-base sm:text-lg leading-tight text-[#fdf8f4]">
                        {slide.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#d6c7b7] line-clamp-1 max-w-[190px]">
                        {slide.subtitle}
                      </p>
                    </div>

                    <button
                      suppressHydrationWarning
                      onClick={() => handleClaimPromo(slide.title, slide.code)}
                      className="px-4 py-1.5 rounded-full bg-white hover:bg-amber-100 text-[#24130a] text-xs font-bold shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                      Klaim &gt;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Controls (dots & arrow buttons, matching Gambar 1) */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {promoSlides.map((_, idx) => (
                  <button
                    suppressHydrationWarning
                    key={idx}
                    onClick={() => setActivePromoIndex(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activePromoIndex === idx ? 'w-6 h-2 bg-[#2a170e]' : 'w-2 h-2 bg-[#d6c7b7]'
                    }`}
                    aria-label={`Slide promo ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    setActivePromoIndex((prev) => (prev > 0 ? prev - 1 : promoSlides.length - 1));
                    showToast('Menampilkan promo sebelumnya');
                  }}
                  className="w-7 h-7 rounded-full bg-[#2a170e] hover:bg-[#b45309] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  aria-label="Promo Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    setActivePromoIndex((prev) => (prev < promoSlides.length - 1 ? prev + 1 : 0));
                    showToast('Menampilkan promo berikutnya');
                  }}
                  className="w-7 h-7 rounded-full bg-[#2a170e] hover:bg-[#b45309] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  aria-label="Promo Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* ── 4. SECTION: FAVORIT PELANGGAN (Menu Favorit, matching Image 1) ── */}
          <section id="menu-favorit" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-[#c05621] uppercase tracking-widest block">
                  FAVORIT PELANGGAN
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#24130a] tracking-tight">
                  Menu Favorit
                </h2>
                <p className="text-xs sm:text-sm text-[#736055] mt-0.5">
                  Paling sering dipesan dan dinikmati setiap harinya
                </p>
              </div>

              <button
                suppressHydrationWarning
                onClick={() => setShowAllMenuSection((prev) => !prev)}
                className="text-xs sm:text-sm font-semibold text-[#b45309] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>{showAllMenuSection ? 'Tutup Daftar Lengkap' : 'Lihat Semua Menu'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Cards Grid */}
            <div className="flex overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {favoriteItems.map((item) => {
                const isFav = !!favorites[item.id];
                const isAdded = justAddedId === item.id;

                return (
                  <div
                    key={item.id}
                    className="w-[62%] min-w-[62%] shrink-0 snap-start sm:w-auto sm:min-w-0 sm:shrink bg-white rounded-3xl p-3.5 border border-[#ece4da] shadow-[0_4px_20px_rgba(42,26,21,0.04)] hover:shadow-[0_12px_32px_rgba(42,26,21,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                  >
                    {/* Top Image + Badge + Heart */}
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#f5ede7] mb-3">
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Badge Top Left */}
                      <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#7a2318] text-white shadow-xs">
                        {item.badge === 'best_seller'
                          ? 'BEST SELLER'
                          : item.badge?.toUpperCase()}
                      </span>

                      {/* Heart Top Right */}
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-[#2a170e] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                        aria-label="Favoritkan"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${
                            isFav ? 'fill-red-500 text-red-500' : 'text-stone-600'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Rating row */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#786458] font-medium">
                          <span className="flex items-center text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                            {item.rating}
                          </span>
                          <span>•</span>
                          <span>{item.sold}</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm sm:text-base text-[#1c1917] leading-tight line-clamp-1 mt-0.5">
                          {item.name}
                        </h3>

                        {/* Description */}
                        <p className="text-[11px] text-[#736055] line-clamp-1">
                          {item.description}
                        </p>
                      </div>

                      {/* Price & Add to Cart Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#f5efe8] mt-2">
                        <div>
                          <span className="text-[10px] text-[#8c786a] block leading-none">Harga</span>
                          <span className="font-extrabold text-sm sm:text-base text-[#1c1917]">
                            {formatRupiah(item.price)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleQuickAdd(item, e)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-black hover:bg-[#b45309] text-white'
                          }`}
                          aria-label={`Tambah ${item.name} ke keranjang`}
                          title="Tambah ke Keranjang"
                        >
                          {isAdded ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 5. SECTION: KURASI SPESIAL (Rekomendasi Untuk Kamu!, matching Image 1) ── */}
          <section className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-[#c05621] uppercase tracking-widest block">
                  KURASI SPESIAL
                </span>
                <h2 className="font-serif font-bold text-2xl text-[#24130a] tracking-tight">
                  Rekomendasi Untuk Kamu!
                </h2>
                <p className="text-xs sm:text-sm text-[#736055] mt-0.5">
                  Racikan khas dengan profil citarasa otentik dan biji kopi pilihan
                </p>
              </div>

              <button
                onClick={() => setShowAllMenuSection((prev) => !prev)}
                className="text-xs sm:text-sm font-semibold text-[#b45309] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>{showAllMenuSection ? 'Tutup Daftar Lengkap' : 'Lihat Semua Menu'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Tall Vertical Photo Cards */}
            <div className="flex overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {recommendationItems.map((rec) => {
                const isFav = !!favorites[rec.id];
                const isAdded = justAddedId === rec.id;

                return (
                  <div
                    key={rec.id}
                    className="relative isolate w-[68%] min-w-[68%] shrink-0 snap-center sm:w-auto sm:min-w-0 sm:shrink aspect-[3/4] rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-4 group border border-white/20 bg-[#24130a]"
                  >
                    {/* Background Full Photo */}
                    <div className="absolute inset-0 bg-[#24130a]">
                      <img
                        src={rec.photoUrl}
                        alt={rec.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                    </div>

                    {/* Top Row: Badge + Heart */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 backdrop-blur-xs text-amber-300 border border-amber-400/30">
                        {rec.badge}
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(rec.id, e)}
                        className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs text-white hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Favoritkan"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'fill-red-500 text-red-500' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Info & Action Button */}
                    <div className="relative z-10 space-y-2">
                      <div>
                        <span className="text-[9px] font-bold tracking-wider text-amber-300 uppercase block">
                          {rec.tag}
                        </span>
                        <h3 className="font-bold text-white text-base leading-snug line-clamp-1 mt-0.5">
                          {rec.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-extrabold text-white text-base">
                          {formatRupiah(rec.price)}
                        </span>

                        <button
                          onClick={(e) => handleQuickAdd(rec as any, e)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white hover:bg-amber-100 text-[#1c110b]'
                          }`}
                          aria-label={`Pesan ${rec.name}`}
                          title="Tambah ke Keranjang"
                        >
                          {isAdded ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 6. SECTION: BELUM TAHU MAU PESAN APA? (Barista Bundles, matching Image 1) ── */}
          <section className="bg-[#f6eee4] rounded-3xl p-6 sm:p-8 border border-[#e8ded2] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#24130a] tracking-tight">
                  Belum Tahu Mau Pesan Apa?
                </h2>
                <p className="text-xs sm:text-sm text-[#736055] mt-0.5">
                  Pilih paket kombinasi kurasi barista dengan paduan rasa paling pas untuk teman harimu
                </p>
              </div>

              <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#d8c8b8] text-xs font-semibold text-[#8b4513] shadow-2xs">
                <Coffee className="w-3.5 h-3.5 text-[#b45309]" />
                <span>Rekomendasi Terbaik Barista</span>
              </div>
            </div>

            {/* 3 Horizontal Combo Cards */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-4 md:mx-0 md:px-0 md:py-0 md:overflow-visible">
              {bundlePackages.map((pkg) => {
                const isAdded = justAddedId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="w-[85%] min-w-[85%] shrink-0 snap-center md:w-auto md:min-w-0 md:shrink bg-white rounded-2xl p-3.5 border border-[#e8ded3] flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-[#f5ede7] shrink-0 border border-[#e8ded3]">
                      <img
                        src={pkg.photoUrl}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-[#b45309] text-[9px] font-bold">
                        {pkg.saveBadge}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-[#1c1917] leading-tight truncate mt-1">
                        {pkg.title}
                      </h3>
                      <p className="text-[11px] text-[#736055] truncate">
                        {pkg.subtitle}
                      </p>

                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-[10px] line-through text-[#a89688]">
                          {formatRupiah(pkg.originalPrice)}
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm text-[#1c1917]">
                          {formatRupiah(pkg.price)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={(e) => handleQuickAdd(pkg as any, e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-black hover:bg-[#b45309] text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? 'Dipilih' : 'Pilih Paket'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

              {/* ── 7. COMPLETE CATALOG SECTION (In Showcase Mode) ── */}
              <section id="koleksi-lengkap" className="pt-2 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8ded3]">
                  <div>
                    <h2 className="font-serif italic font-bold text-2xl text-[#24130a]">
                      Koleksi Lengkap Warkop Betawa
                    </h2>
                    <p className="text-xs text-[#736055]">
                      {filteredItems.length} hidangan lezat siap disajikan
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {filteredItems.map((item) => {
                    const itemId = item.id || item._id || '';
                    const isAdded = justAddedId === itemId;
                    const isFav = !!favorites[itemId];

                    return (
                      <div
                        key={itemId}
                        className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-3.5 border border-[#ece4da] shadow-[0_4px_16px_rgba(42,26,21,0.03)] hover:shadow-[0_8px_24px_rgba(42,26,21,0.06)] hover:-translate-y-1 transition-all flex flex-col justify-between group"
                      >
                        <Link
                          href={`/menu/${itemId}`}
                          className="block relative aspect-square sm:aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#f5ede7] mb-1.5 sm:mb-3"
                        >
                          <img
                            src={
                              item.photoUrl ||
                              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {item.badge && item.badge !== 'none' ? (
                            <span className="hidden sm:block absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#1c110b] text-white shadow-xs">
                              {item.badge.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="hidden sm:block absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-black/60 backdrop-blur-xs text-white shadow-xs">
                              {item.category}
                            </span>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(itemId, e)}
                            className="absolute top-1 right-1 w-5 h-5 sm:top-2.5 sm:right-2.5 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white text-[#2a170e] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                            aria-label="Favoritkan"
                          >
                            <Heart
                              className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${
                                isFav ? 'fill-red-500 text-red-500' : 'text-stone-600'
                              }`}
                            />
                          </button>
                        </Link>

                        <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>4.9</span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-500 text-[10px]">Terlaris</span>
                            </div>
                            <Link href={`/menu/${itemId}`}>
                              <h3 className="font-bold text-[10px] leading-tight max-sm:line-clamp-2 sm:text-base text-[#1c1917] sm:truncate hover:text-[#b45309] transition-colors sm:mt-0.5">
                                {item.name}
                              </h3>
                            </Link>
                            {item.description && (
                              <p className="hidden sm:block text-[11px] sm:text-xs text-[#736055] line-clamp-2 min-h-[32px] mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-stretch gap-1 pt-1.5 sm:flex-row sm:items-end sm:justify-between sm:pt-3 border-t border-[#f5efe8] mt-1 sm:mt-2">
                            <div>
                              <span className="hidden sm:block text-[9px] uppercase font-bold text-[#8c786a] leading-none">
                                Harga
                              </span>
                              <span className="font-extrabold text-[10px] sm:text-base text-[#1c1917] block sm:mt-0.5">
                                {formatRupiah(item.price)}
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleQuickAdd(item, e)}
                              className={`w-full h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-black hover:bg-[#b45309] text-white'
                              }`}
                              aria-label={`Tambah ${item.name} ke keranjang`}
                            >
                              {isAdded ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section id="category-catalog" className="pt-2 space-y-6">
              {/* ── DEDICATED CATEGORY / SEARCH VIEW (Strictly matching selected category) ── */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#e8ded3]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#c05621] uppercase tracking-widest block">
                      {searchQuery ? 'HASIL PENCARIAN' : 'KATALOG MENU'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#faede3] text-[#78350f] text-[11px] font-bold">
                      {filteredItems.length} Menu
                    </span>
                  </div>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#24130a] tracking-tight mt-1">
                    {searchQuery ? `Hasil Pencarian: "${searchQuery}"` : getCategoryTitle(selectedCategory)}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#736055] mt-1">
                    {searchQuery
                      ? `Menampilkan ${filteredItems.length} hidangan yang sesuai dengan pencarian Anda.`
                      : getCategorySubtitle(selectedCategory)}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategory('semua');
                    setSearchQuery('');
                    searchEvents.setQuery('');
                  }}
                  className="px-4 py-2 rounded-full bg-white hover:bg-stone-100 text-[#1c110b] text-xs font-bold border border-[#e8ded3] shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#b45309]" />
                  <span>Kembali ke Semua Menu</span>
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-[#e8ded3] shadow-xs space-y-3">
                  <p className="text-[#8c5950] font-semibold text-base">
                    Hidangan yang dicari tidak ditemukan.
                  </p>
                  <p className="text-xs text-[#8c786a] max-w-sm mx-auto">
                    Silakan pilih kategori lain atau kembali ke seluruh menu.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('semua');
                      setSearchQuery('');
                      searchEvents.setQuery('');
                    }}
                    className="mt-2 px-5 py-2 rounded-full bg-[#1c110b] text-white text-xs font-bold hover:bg-[#b45309] transition-colors cursor-pointer"
                  >
                    Tampilkan Semua Menu
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {filteredItems.map((item) => {
                    const itemId = item.id || item._id || '';
                    const isAdded = justAddedId === itemId;
                    const isFav = !!favorites[itemId];

                    return (
                      <div
                        key={itemId}
                        className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-3.5 border border-[#ece4da] shadow-[0_4px_16px_rgba(42,26,21,0.03)] hover:shadow-[0_8px_24px_rgba(42,26,21,0.06)] hover:-translate-y-1 transition-all flex flex-col justify-between group"
                      >
                        <Link
                          href={`/menu/${itemId}`}
                          className="block relative aspect-square sm:aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#f5ede7] mb-1.5 sm:mb-3"
                        >
                          <img
                            src={
                              item.photoUrl ||
                              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {item.badge && item.badge !== 'none' ? (
                            <span className="hidden sm:block absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#1c110b] text-white shadow-xs">
                              {item.badge.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="hidden sm:block absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-black/60 backdrop-blur-xs text-white shadow-xs">
                              {item.category}
                            </span>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(itemId, e)}
                            className="absolute top-1 right-1 w-5 h-5 sm:top-2.5 sm:right-2.5 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white text-[#2a170e] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                            aria-label="Favoritkan"
                          >
                            <Heart
                              className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${
                                isFav ? 'fill-red-500 text-red-500' : 'text-stone-600'
                              }`}
                            />
                          </button>
                        </Link>

                        <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>4.9</span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-500 text-[10px]">Terlaris</span>
                            </div>
                            <Link href={`/menu/${itemId}`}>
                              <h3 className="font-bold text-[10px] leading-tight max-sm:line-clamp-2 sm:text-base text-[#1c1917] sm:truncate hover:text-[#b45309] transition-colors sm:mt-0.5">
                                {item.name}
                              </h3>
                            </Link>
                            {item.description && (
                              <p className="hidden sm:block text-[11px] sm:text-xs text-[#736055] line-clamp-2 min-h-[32px] mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-stretch gap-1 pt-1.5 sm:flex-row sm:items-end sm:justify-between sm:pt-3 border-t border-[#f5efe8] mt-1 sm:mt-2">
                            <div>
                              <span className="hidden sm:block text-[9px] uppercase font-bold text-[#8c786a] leading-none">
                                Harga
                              </span>
                              <span className="font-extrabold text-[10px] sm:text-base text-[#1c1917] block sm:mt-0.5">
                                {formatRupiah(item.price)}
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleQuickAdd(item, e)}
                              className={`w-full h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-black hover:bg-[#b45309] text-white'
                              }`}
                              aria-label={`Tambah ${item.name} ke keranjang`}
                            >
                              {isAdded ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>

        {/* ── 8. INTEGRATED FOOTER (matching Gambar 1) ── */}
        <footer className="bg-[#1c110b] text-[#d6c5b6] px-6 sm:px-10 lg:px-12 py-10 sm:py-12 mt-14 border-t border-[#2e1b12]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Col */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/warkop-betawa-logo.png"
                  alt="Warkop Betawa"
                  className="w-10 h-10 rounded-full border border-amber-500/30 object-cover"
                />
                <h3 className="font-serif italic font-extrabold text-2xl text-white tracking-wide">
                  WARKOP BETAWA
                </h3>
              </div>
              <p className="text-xs text-[#a89688] leading-relaxed max-w-md font-light">
                Meracik kenangan rasa, warkop nusantara berakar kehangatan masakan Betawi tempo 1984, diolah segar dengan rempah nusantara pilihan berkualitas mutu terbaik.
              </p>
              <p className="text-[11px] text-[#736055] pt-3">
                &copy; 2026 Semua Tradisi Nusantara. Hak Cipta Dilindungi.
              </p>
            </div>

            {/* Layanan */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-sm tracking-wide">Layanan</h4>
              <ul className="space-y-2 text-xs text-[#a89688]">
                <li>
                  <button onClick={() => setIsReservationModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    Dine In
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsCartOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    Ambil Sendiri
                  </button>
                </li>
                <li>
                  <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Catering
                  </a>
                </li>
              </ul>
            </div>

            {/* Hubungi Kami */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-sm tracking-wide">Hubungi Kami</h4>
              <ul className="space-y-2 text-xs text-[#a89688]">
                <li>
                  <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/warkopbetawa" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="mailto:halo@warkopbetawa.id" className="hover:text-white transition-colors">
                    Email Support
                  </a>
                </li>
                <li className="pt-2">
                  <Link href="/admin" className="text-[11px] text-[#e59866] hover:underline">
                    Staff Portal / Admin Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE BOTTOM CART FLOATING BAR
      ══════════════════════════════════════════════════════════════════ */}
      {isMounted && cartCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#1c110b] text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-amber-500/30 cursor-pointer"
          >
            <div>
              <div className="text-[10px] text-[#e59866] uppercase font-bold tracking-wider">
                Keranjangmu
              </div>
              <div className="font-serif font-bold text-base">
                {cartCount} Item • {formatRupiah(cartTotal)}
              </div>
            </div>
            <div className="px-4 py-2 bg-white text-[#1c110b] font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5">
              <span>Buka</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: RESERVASI MEJA / PILIH MEJA
      ══════════════════════════════════════════════════════════════════ */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#faf5ee] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#d8c8b8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1c110b] text-amber-300 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#24130a]">
                    Pilih Nomor Meja
                  </h3>
                  <p className="text-xs text-[#736055]">
                    Untuk pesanan Dine-In langsung diantar ke meja Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReservationModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-200 text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid 20 Meja */}
            <div>
              <label className="text-xs font-bold text-[#24130a] mb-2 block">
                Pilih Meja Tersedia:
              </label>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
                  const isCur = selectedTableNumber === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setSelectedTableNumber(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        isCur
                          ? 'bg-[#1c110b] text-amber-300 shadow-md scale-105'
                          : 'bg-white hover:bg-amber-100 text-[#24130a] border border-[#e0d5c8]'
                      }`}
                    >
                      #{num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200/60 text-xs text-[#735a4b] space-y-1">
              <p className="font-bold text-[#b45309]">
                ✓ Meja Terpilih: Meja #{selectedTableNumber}
              </p>
              <p className="text-[11px] leading-relaxed">
                Nomor meja ini akan disimpan untuk sesi pemesanan dan checkout Anda.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsReservationModalOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmReservation(selectedTableNumber)}
                className="flex-1 py-2.5 rounded-full bg-[#1c110b] hover:bg-[#b45309] text-white text-xs font-bold shadow-md transition-colors"
              >
                Konfirmasi Meja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: DAFTAR VOUCHER AKTIF
      ══════════════════════════════════════════════════════════════════ */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#faf5ee] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#d8c8b8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#1c110b] text-amber-300 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#24130a]">
                    Voucher Aktif Hari Ini
                  </h3>
                  <p className="text-xs text-[#736055]">
                    Salin kode voucher untuk potongan harga di checkout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-200 text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-3.5 border border-[#e8ded3] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#b45309] uppercase">Diskon 20%</span>
                  <h4 className="font-bold text-xs text-[#1c1917]">SENJA20</h4>
                  <p className="text-[11px] text-[#736055]">Untuk semua racikan espresso & latte</p>
                </div>
                <button
                  onClick={() => {
                    handleClaimPromo('Diskon 20%', 'SENJA20');
                    setIsVoucherModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#1c110b] text-white text-xs font-bold hover:bg-[#b45309] transition-colors"
                >
                  Pakai
                </button>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-[#e8ded3] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Potongan Langsung</span>
                  <h4 className="font-bold text-xs text-[#1c1917]">PAGIHEMAT</h4>
                  <p className="text-[11px] text-[#736055]">Paket sarapan hemat pagi hari</p>
                </div>
                <button
                  onClick={() => {
                    handleClaimPromo('Pagi Hemat', 'PAGIHEMAT');
                    setIsVoucherModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#1c110b] text-white text-xs font-bold hover:bg-[#b45309] transition-colors"
                >
                  Pakai
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/promo"
                className="text-xs font-bold text-[#b45309] hover:underline"
              >
                Lihat Halaman Promo &amp; Kupon Lengkap &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SLIDE-OVER CART DRAWER & AI CHAT PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {isMounted && (
        <>
          <FloatingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <AIChatPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FLOATING TOAST NOTIFICATION
      ══════════════════════════════════════════════════════════════════ */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-8 z-50 max-w-sm bg-[#1c110b] text-[#f7f2ea] px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <p className="text-xs font-medium text-[#fdf8f4] flex-1">
            {toastMessage}
          </p>
        </div>
      )}
    </div>
  );
}
