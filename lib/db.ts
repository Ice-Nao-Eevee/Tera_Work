/**
 * lib/db.ts — Next.js-safe cached Mongoose connection.
 *
 * Uses a module-level cache (via `global`) so that a single connection is
 * reused across hot reloads in development and across serverless invocations
 * in production.  Switching between local MongoDB and Atlas is purely an
 * env-var change (MONGODB_URI) — no code changes required.
 */

import mongoose from 'mongoose';
import {
  CategoryModel,
  MenuItemModel,
  TableModel,
  PromoModel,
  SettingsModel,
} from './models';
import { generateTableToken } from './jwt';
import {
  STATIC_CATEGORIES,
  STATIC_MENU_ITEMS,
  STATIC_PROMOS,
  STATIC_SETTINGS,
} from './staticData';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// ── Global cache (survives Next.js hot-reloads in dev) ───────────────────────
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

const cached = global._mongooseCache;

// ── Main connect function ─────────────────────────────────────────────────────
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then(async (mg) => {
        console.log('✅ Connected to MongoDB:', MONGODB_URI.split('/').pop());
        await seedDatabaseIfEmpty();
        return mg;
      })
      .catch((err) => {
        // Reset cache so the next request retries the connection
        cached.conn = null;
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ── Auto-seed on first connection ────────────────────────────────────────────
async function seedDatabaseIfEmpty() {
  const count = await MenuItemModel.countDocuments();
  if (count > 0) return; // already seeded

  console.log('🌱 Seeding database with initial data...');

  // Strip the string _id fields from static data so MongoDB generates ObjectIds
  const stripId = <T extends { _id?: any }>(items: T[]): Omit<T, '_id'>[] =>
    items.map(({ _id, ...rest }) => rest);

  await CategoryModel.insertMany(stripId(STATIC_CATEGORIES));
  await MenuItemModel.insertMany(stripId(STATIC_MENU_ITEMS));
  await PromoModel.insertMany(stripId(STATIC_PROMOS));
  await SettingsModel.create({ ...STATIC_SETTINGS });

  // Seed tables 1–10
  for (let i = 1; i <= 10; i++) {
    const id = `table-${i}`;
    await TableModel.create({
      tableNumber: i,
      qrToken: generateTableToken(id, i),
      isActive: true,
    });
  }

  console.log('✅ Database seeded successfully.');
}
