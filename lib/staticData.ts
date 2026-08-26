/**
 * Static initial data for client-safe usage.
 * This file must NOT import any server-only modules (mongoose, jwt, etc.)
 * It is safe to import from client components.
 */

import type { ICategory, IMenuItem, IPromo, ISettings } from './models';

export const STATIC_CATEGORIES: ICategory[] = [
  { _id: 'cat-1', name: 'Semua Menu', slug: 'semua', sortOrder: 0 },
  { _id: 'cat-2', name: 'Makanan Utama', slug: 'makanan', sortOrder: 1 },
  { _id: 'cat-3', name: 'Minuman', slug: 'minuman', sortOrder: 2 },
  { _id: 'cat-4', name: 'Cemilan', slug: 'cemilan', sortOrder: 3 },
  { _id: 'cat-5', name: 'Dessert', slug: 'dessert', sortOrder: 4 },
];

export const STATIC_MENU_ITEMS: IMenuItem[] = [
  {
    _id: 'item-1',
    name: 'Nasi Goreng Spesial',
    description: 'Wok-fried rice with secret heritage spices, sunny egg, and chicken satay',
    price: 45000,
    category: 'makanan',
    photoUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
    badge: 'best_seller',
    spiceLevels: [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: [
      { label: 'Ekstra Telur', price: 5000 },
      { label: 'Ekstra Ayam', price: 10000 },
      { label: 'Ekstra Sambal Ulek', price: 3000 },
    ],
    isActive: true,
  },
  {
    _id: 'item-2',
    name: 'Sate Ayam Madura',
    description: 'Char-grilled chicken skewers smothered in rich, sweet peanut sauce',
    price: 38000,
    category: 'makanan',
    photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    badge: 'best_seller',
    spiceLevels: [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: [
      { label: 'Ekstra Bumbu Kacang', price: 4000 },
      { label: 'Ekstra Lontong', price: 5000 },
    ],
    isActive: true,
  },
  {
    _id: 'item-3',
    name: 'Soto Ayam Ambengan',
    description: 'Clear, aromatic yellow chicken soup served with koya powder',
    price: 35000,
    category: 'makanan',
    photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    badge: 'chefs_choice',
    spiceLevels: [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: [
      { label: 'Ekstra Koya', price: 3000 },
      { label: 'Ekstra Telur Rebus', price: 5000 },
    ],
    isActive: true,
  },
  {
    _id: 'item-4',
    name: 'Es Teh Manis',
    description: 'Signature brewed black tea served chilled with pure cane sugar',
    price: 12000,
    category: 'minuman',
    photoUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    badge: 'none',
    spiceLevels: [],
    addOns: [
      { label: 'Less Sugar', price: 0 },
      { label: 'Ekstra Lemon', price: 3000 },
    ],
    isActive: true,
  },
  {
    _id: 'item-5',
    name: 'Gado-Gado Batavia',
    description: 'Mixed vegetable salad with classic peanut sauce and crackers',
    price: 32000,
    category: 'makanan',
    photoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    badge: 'vegan_friendly',
    spiceLevels: [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: [
      { label: 'Ekstra Kerupuk', price: 3000 },
      { label: 'Ekstra Telur', price: 5000 },
    ],
    isActive: true,
  },
  {
    _id: 'item-6',
    name: 'Rendang Daging Sapi',
    description: 'Slow-cooked beef in rich coconut milk and signature spices',
    price: 55000,
    category: 'makanan',
    photoUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    badge: 'none',
    spiceLevels: [
      { label: 'Tidak Pedas', priceModifier: 0 },
      { label: 'Sedang', priceModifier: 0 },
      { label: 'Pedas', priceModifier: 0 },
    ],
    addOns: [{ label: 'Nasi Putih Warm', price: 6000 }],
    isActive: true,
  },
  {
    _id: 'item-7',
    name: 'Pisang Goreng Madu',
    description: 'Crispy honey-glazed banana fritters, a perfect sweet ending',
    price: 22000,
    category: 'dessert',
    photoUrl: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=800&q=80',
    badge: 'none',
    spiceLevels: [],
    addOns: [
      { label: 'Ekstra Keju', price: 5000 },
      { label: 'Cokelat Meeres', price: 4000 },
    ],
    isActive: true,
  },
];

export const STATIC_PROMOS: IPromo[] = [
  {
    _id: 'promo-1',
    title: 'Paket Hemat! Ayam + Lalapan + Es Teh',
    description:
      'Yuk, sekalian pesan paket hemat untuk keluarga di rumah agar santap makan lebih lengkap dan meriah!',
    originalPrice: 40000,
    discountedPrice: 30000,
    isActive: true,
  },
];

export const STATIC_SETTINGS: ISettings = {
  taxRatePercent: 10,
  serviceChargeRatePercent: 5,
  restaurantInfo: {
    name: 'Selera Sambal',
    address: 'Jl. Nusantara No. 14, Jakarta',
    whatsapp: '+6281234567890',
    instagram: '@selerasambal',
    email: 'halo@selerasambal.id',
  },
};
