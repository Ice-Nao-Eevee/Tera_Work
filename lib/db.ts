/**
 * lib/db.ts — Database utilities for Selera Sambal.
 *
 * Uses Prisma + Supabase PostgreSQL.
 * getMemoryStore() provides a static fallback when no DB connection is available.
 * seedDatabaseIfEmpty() populates the DB with initial data on first run.
 */

import prisma from './prisma';
import {
  STATIC_CATEGORIES,
  STATIC_MENU_ITEMS,
  STATIC_PROMOS,
  STATIC_SETTINGS,
} from './staticData';
import { generateTableToken } from './jwt';

// ── Re-export aliases ─────────────────────────────────────────────────────────
export const INITIAL_MENU_ITEMS = STATIC_MENU_ITEMS;
export const INITIAL_PROMOS = STATIC_PROMOS;

/** Returns an in-memory store snapshot (fallback when DB is unavailable). */
export function getMemoryStore() {
  return {
    menuItems: STATIC_MENU_ITEMS,
    promos: STATIC_PROMOS,
    categories: STATIC_CATEGORIES,
    settings: STATIC_SETTINGS,
  };
}

// ── Seed tracker (run once per process) ──────────────────────────────────────
let _seeded = false;

/**
 * Call at the top of any route handler to ensure the DB is seeded.
 * Safe to call multiple times — seeds only once per process lifetime.
 */
export async function connectDB(): Promise<void> {
  if (_seeded) return;
  _seeded = true;
  try {
    await seedDatabaseIfEmpty();
  } catch (err) {
    _seeded = false; // allow retry on next request
    console.error('❌ DB seed failed:', err);
  }
}

// ── Auto-seed on first connection ────────────────────────────────────────────
async function seedDatabaseIfEmpty() {
  const count = await prisma.menuItem.count();
  if (count > 0) return; // already seeded

  console.log('🌱 Seeding Supabase database with initial data...');

  // Categories
  for (const cat of STATIC_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder },
    });
  }

  // Menu items
  for (const item of STATIC_MENU_ITEMS) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        photoUrl: item.photoUrl,
        badge: item.badge ?? 'none',
        spiceLevels: item.spiceLevels as any,
        addOns: item.addOns as any,
        isActive: item.isActive,
      },
    });
  }

  // Promos
  for (const promo of STATIC_PROMOS) {
    await prisma.promo.create({
      data: {
        title: promo.title,
        description: promo.description,
        originalPrice: promo.originalPrice,
        discountedPrice: promo.discountedPrice,
        isActive: promo.isActive,
      },
    });
  }

  // Settings singleton
  await prisma.settings.create({
    data: {
      taxRatePercent: STATIC_SETTINGS.taxRatePercent,
      serviceChargeRatePercent: STATIC_SETTINGS.serviceChargeRatePercent,
      restaurantInfo: STATIC_SETTINGS.restaurantInfo as any,
    },
  });

  // Tables 1–10
  for (let i = 1; i <= 10; i++) {
    const id = `table-${i}`;
    await prisma.restaurantTable.create({
      data: {
        tableNumber: i,
        qrToken: generateTableToken(id, i),
        isActive: true,
      },
    });
  }

  console.log('✅ Database seeded successfully.');
}

