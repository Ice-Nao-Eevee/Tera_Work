/**
 * lib/db.ts — Database utilities for Warkop Betawa.
 *
 * Uses Prisma + Supabase PostgreSQL.
 * getMemoryStore() provides a static fallback when no DB connection is available.
 * Demo data can be seeded explicitly through SEED_DEMO_DATA=true.
 */

import prisma from './prisma';
import {
  STATIC_CATEGORIES,
  STATIC_MENU_ITEMS,
  STATIC_PROMOS,
  STATIC_SETTINGS,
} from './staticData';
import {
  generateTableTokenString,
  generateUniqueTableToken,
  TABLE_TOKEN_LENGTH,
} from './tableToken';

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

// ── Seed tracker (run once per process lifetime) ─────────────────────────────
const globalForDb = globalThis as unknown as { _dbSeeded?: boolean };

const WEAK_SEED_PASSWORDS = new Set([
  'admin',
  'admin123',
  'admin123456',
  'password',
  'password123',
  '12345678',
  '123456789012',
  'selerasambal',
]);

/**
 * Validates ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD when seeding admin config (Task F1).
 * Never creates a default admin account with a hardcoded password.
 * Throws if seed credentials are provided (or required in production seed mode) but are empty,
 * shorter than 12 characters, or match known weak passwords.
 */
export function validateAdminSeedCredentials(
  email = process.env.ADMIN_SEED_EMAIL,
  password = process.env.ADMIN_SEED_PASSWORD,
  requirePresent = false
): { email: string; password: string } | null {
  const cleanEmail = (email ?? '').trim();
  const cleanPassword = (password ?? '').trim();

  if (!cleanEmail && !cleanPassword && !requirePresent) {
    return null;
  }

  if (!cleanEmail || !cleanPassword) {
    throw new Error(
      'ADMIN_SEED_EMAIL dan ADMIN_SEED_PASSWORD wajib diisi keduanya dan tidak boleh kosong.'
    );
  }

  if (cleanPassword.length < 12) {
    throw new Error(
      'ADMIN_SEED_PASSWORD ditolak: panjang password minimal 12 karakter.'
    );
  }

  if (WEAK_SEED_PASSWORDS.has(cleanPassword.toLowerCase())) {
    throw new Error(
      'ADMIN_SEED_PASSWORD ditolak: jangan gunakan password umum/default.'
    );
  }

  return { email: cleanEmail, password: cleanPassword };
}

/**
 * Call at the top of any route handler to ensure the DB is seeded.
 * Safe to call multiple times — seeds only once per process lifetime,
 * persisted across Next.js dev server hot module re-evaluations.
 */
export async function connectDB(): Promise<void> {
  if (globalForDb._dbSeeded) return;
  globalForDb._dbSeeded = true;
  try {
    // Validate ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD if set (Task F1)
    validateAdminSeedCredentials();

    // Never repopulate a production menu automatically after its last item is deleted.
    if (process.env.SEED_DEMO_DATA === 'true') {
      await seedDatabaseIfEmpty();
    }
    await seedCouponsIfEmpty();
    await seedTablesIfEmpty();
    await backfillLegacyTableTokens();
  } catch (err) {
    globalForDb._dbSeeded = false; // allow retry on failure
    console.error('❌ DB seed failed:', err);
  }
}

async function seedCouponsIfEmpty() {
  try {
    const couponCount = await prisma.coupon.count();
    if (couponCount === 0) {
      await prisma.coupon.create({
        data: {
          code: 'BETAWAHEMAT',
          title: 'Kupon Hemat 20%',
          description: 'Potongan 20% untuk semua pesanan makan di tempat. Maksimal potongan Rp 15.000, minimal belanja Rp 30.000.',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minOrderAmount: 30000,
          maxDiscountAmount: 15000,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2028-12-31'),
          isActive: true,
        },
      });
      await prisma.coupon.create({
        data: {
          code: 'KASIH10K',
          title: 'Potongan Langsung Rp 10.000',
          description: 'Potongan langsung Rp 10.000 dengan minimal belanja Rp 50.000.',
          discountType: 'FIXED',
          discountValue: 10000,
          minOrderAmount: 50000,
          maxDiscountAmount: null,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2028-12-31'),
          isActive: true,
        },
      });
      console.log('✅ Initial coupons seeded.');
    }
  } catch (e) {
    console.error('Coupons seed error:', e);
  }
}

/** Seeds sample tables 1–10 (unique QR tokens) when the tables table is empty. */
async function seedTablesIfEmpty() {
  try {
    if ((await prisma.restaurantTable.count()) > 0) return;
    for (let i = 1; i <= 10; i++) {
      await prisma.restaurantTable.create({
        data: { tableNumber: i, qrToken: generateTableTokenString(), isActive: true },
      });
    }
    console.log('✅ Sample tables 1–10 seeded.');
  } catch (e) {
    console.error('Tables seed error:', e);
  }
}

/** Replaces legacy or <16-char qrTokens with 16-char nanoid tokens (never touches orders). */
async function backfillLegacyTableTokens() {
  try {
    const tables = await prisma.restaurantTable.findMany({ select: { id: true, qrToken: true } });
    for (const t of tables) {
      if (t.qrToken && t.qrToken.length >= TABLE_TOKEN_LENGTH) continue;
      await prisma.restaurantTable.update({
        where: { id: t.id },
        data: { qrToken: await generateUniqueTableToken() },
      });
    }
  } catch (e) {
    console.error('Table token backfill error:', e);
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
    await prisma.restaurantTable.create({
      data: {
        tableNumber: i,
        qrToken: generateTableTokenString(),
        isActive: true,
      },
    });
  }

  console.log('✅ Database seeded successfully.');
}

