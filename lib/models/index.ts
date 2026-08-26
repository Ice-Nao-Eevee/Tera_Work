import mongoose, { Schema, Document, Model } from 'mongoose';

// Types & Interfaces
export interface ICategory {
  _id?: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ISpiceLevel {
  label: string; // 'Tidak Pedas' | 'Sedang' | 'Pedas'
  priceModifier: number;
}

export interface IAddOn {
  label: string; // e.g. 'Ekstra Telur'
  price: number;
}

export interface IMenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string; // category slug or name
  photoUrl: string;
  badge?: 'none' | 'best_seller' | 'chefs_choice' | 'vegan_friendly';
  spiceLevels: ISpiceLevel[];
  addOns: IAddOn[];
  isActive: boolean;
}

export interface ITable {
  _id?: string;
  tableNumber: number;
  qrToken: string;
  isActive: boolean;
}

export interface IPromo {
  _id?: string;
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
  _id?: string;
  orderCode: string; // format #ARU-8821
  tableNumber: number;
  items: IOrderItem[];
  notes?: string;
  subtotal: number;
  taxAmount: number; // PB1 10%
  serviceChargeAmount: number; // 5%
  total: number;
  status: 'received' | 'preparing' | 'ready' | 'completed';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ISettings {
  taxRatePercent: number; // default 10
  serviceChargeRatePercent: number; // default 5
  restaurantInfo: {
    name: string;
    address: string;
    whatsapp: string;
    instagram: string;
    email: string;
  };
}

// Mongoose Schemas
const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
});

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  photoUrl: { type: String, required: true },
  badge: { type: String, enum: ['none', 'best_seller', 'chefs_choice', 'vegan_friendly'], default: 'none' },
  spiceLevels: [
    {
      label: { type: String, required: true },
      priceModifier: { type: Number, default: 0 },
    },
  ],
  addOns: [
    {
      label: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
  isActive: { type: Boolean, default: true },
});

const TableSchema = new Schema<ITable>({
  tableNumber: { type: Number, required: true, unique: true },
  qrToken: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const PromoSchema = new Schema<IPromo>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderCode: { type: String, required: true, unique: true },
    tableNumber: { type: Number, required: true },
    items: [
      {
        menuItemId: String,
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        spiceLevel: String,
        addOns: [{ label: String, price: Number }],
        lineTotal: { type: Number, required: true },
      },
    ],
    notes: { type: String, default: '' },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    serviceChargeAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['received', 'preparing', 'ready', 'completed'],
      default: 'received',
    },
  },
  { timestamps: true }
);

const SettingsSchema = new Schema<ISettings>({
  taxRatePercent: { type: Number, default: 10 },
  serviceChargeRatePercent: { type: Number, default: 5 },
  restaurantInfo: {
    name: { type: String, default: 'Selera Sambal' },
    address: { type: String, default: 'Jl. Nusantara No. 14, Jakarta' },
    whatsapp: { type: String, default: '+6281234567890' },
    instagram: { type: String, default: '@selerasambal' },
    email: { type: String, default: 'halo@selerasambal.id' },
  },
});

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export const MenuItemModel: Model<IMenuItem> =
  mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export const TableModel: Model<ITable> =
  mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);

export const PromoModel: Model<IPromo> =
  mongoose.models.Promo || mongoose.model<IPromo>('Promo', PromoSchema);

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export const SettingsModel: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
