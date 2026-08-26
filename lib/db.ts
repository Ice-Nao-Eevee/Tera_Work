import mongoose from 'mongoose';
import {
  CategoryModel,
  MenuItemModel,
  TableModel,
  PromoModel,
  SettingsModel,
  OrderModel,
  ITable,
  IOrder,
} from './models';
import { generateTableToken } from './jwt';
import {
  STATIC_CATEGORIES,
  STATIC_MENU_ITEMS,
  STATIC_PROMOS,
  STATIC_SETTINGS,
} from './staticData';

// Re-export static data under legacy names so server-side code still works
export const INITIAL_CATEGORIES = STATIC_CATEGORIES;
export const INITIAL_MENU_ITEMS = STATIC_MENU_ITEMS;
export const INITIAL_PROMOS = STATIC_PROMOS;
export const INITIAL_SETTINGS = STATIC_SETTINGS;

const MONGODB_URI = process.env.MONGODB_URI || '';

let isConnected = false;

// Global in-memory cache for fast fallback
let memoryStore = {
  categories: [...STATIC_CATEGORIES],
  menuItems: [...STATIC_MENU_ITEMS],
  promos: [...STATIC_PROMOS],
  settings: { ...STATIC_SETTINGS },
  tables: [
    { _id: 'table-1', tableNumber: 1, qrToken: generateTableToken('table-1', 1), isActive: true },
    { _id: 'table-2', tableNumber: 2, qrToken: generateTableToken('table-2', 2), isActive: true },
    { _id: 'table-3', tableNumber: 3, qrToken: generateTableToken('table-3', 3), isActive: true },
    { _id: 'table-5', tableNumber: 5, qrToken: generateTableToken('table-5', 5), isActive: true },
    { _id: 'table-10', tableNumber: 10, qrToken: generateTableToken('table-10', 10), isActive: true },
  ] as ITable[],
  orders: [] as IOrder[],
};

export async function connectDB() {
  if (isConnected) return;

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      isConnected = true;
      console.log('Connected to MongoDB Atlas');
      await seedDatabaseIfEmpty();
      return;
    } catch (err) {
      console.warn('MongoDB connection failed, falling back to memory store:', err);
    }
  }
  console.log('Running Selera Sambal with hybrid in-memory store');
}

async function seedDatabaseIfEmpty() {
  if (!isConnected) return;
  const count = await MenuItemModel.countDocuments();
  if (count === 0) {
    await CategoryModel.insertMany(STATIC_CATEGORIES);
    await MenuItemModel.insertMany(STATIC_MENU_ITEMS);
    await PromoModel.insertMany(STATIC_PROMOS);
    await SettingsModel.create(STATIC_SETTINGS);

    // Seed Tables
    for (let i = 1; i <= 10; i++) {
      const id = `table-${i}`;
      await TableModel.create({
        tableNumber: i,
        qrToken: generateTableToken(id, i),
        isActive: true,
      });
    }
  }
}

export function getMemoryStore() {
  return memoryStore;
}
