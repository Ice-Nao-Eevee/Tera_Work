/**
 * lib/types.ts — Shared TypeScript interfaces for the entire app.
 * Framework-agnostic: safe to import from client and server components alike.
 */

export interface ICategory {
  id: string;
  _id?: string; // compat: static fallback data uses _id
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ISpiceLevel {
  label: string; // 'Tidak Pedas' | 'Sedang' | 'Pedas'
  priceModifier: number;
}

export interface IAddOn {
  label: string;
  price: number;
}

export interface IMenuItem {
  id: string;
  _id?: string; // compat: static fallback data uses _id
  name: string;
  description: string;
  price: number;
  category: string;
  photoUrl: string;
  badge?: 'none' | 'best_seller' | 'chefs_choice' | 'vegan_friendly';
  spiceLevels: ISpiceLevel[];
  addOns: IAddOn[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITable {
  id: string;
  tableNumber: number;
  qrToken: string;
  isActive: boolean;
}

export interface IPromo {
  id: string;
  _id?: string; // compat: static fallback data uses _id
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  isActive: boolean;
}

export interface IOrderItem {
  menuItemId?: string;
  name: string;
  qty: number;
  price: number;
  spiceLevel?: string;
  addOns: { label: string; price: number }[];
  lineTotal: number;
}

export interface IOrder {
  id: string;
  _id?: string; // compat with Mongoose responses
  orderCode: string;
  tableNumber: number;
  items: IOrderItem[];
  notes?: string;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  status: 'received' | 'preparing' | 'ready' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRestaurantInfo {
  name: string;
  address: string;
  whatsapp: string;
  instagram: string;
  email: string;
}

export interface ISettings {
  id?: string;
  taxRatePercent: number;
  serviceChargeRatePercent: number;
  restaurantInfo: IRestaurantInfo;
}

