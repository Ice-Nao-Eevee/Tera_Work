import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, getMemoryStore } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { getCachedMenu, setCachedMenu, invalidateMenuCache } from '@/lib/menuCache';
import { safeImageUrlOrEmpty } from '@/lib/safeUrl';

const spiceLevelSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    priceModifier: z.coerce.number().int().min(0).max(2147483647).default(0),
  })
  .strict();

const addOnSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    price: z.coerce.number().int().min(0).max(2147483647),
  })
  .strict();

const createMenuItemSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama menu wajib diisi').max(200),
    description: z.string().max(1000).optional().default(''),
    price: z.coerce
      .number()
      .int()
      .min(0, 'Harga menu harus berupa angka dan tidak boleh negatif')
      .max(2147483647, 'Harga terlalu besar (maksimal Rp 2.147.483.647)'),
    category: z.string().trim().min(1, 'Kategori menu wajib diisi').max(100),
    photoUrl: z
      .string()
      .max(2048)
      .optional()
      .default('')
      .refine((v) => safeImageUrlOrEmpty(v) !== null, {
        message: 'URL foto harus berupa URL http(s) yang valid.',
      }),
    badge: z.string().trim().max(50).optional().default('none'),
    spiceLevels: z.array(spiceLevelSchema).max(10).optional().default([]),
    addOns: z.array(addOnSchema).max(30).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

// GET /api/menu — list all active menu items + all categories (or all=true for admin)
export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('all') === 'true';
    if (includeInactive) {
      const denied = requireAdmin(req);
      if (denied) return denied;
    }

    if (!includeInactive) {
      const cached = getCachedMenu();
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      }
    }

    await connectDB();

    const [menuItems, categories] = await Promise.all([
      prisma.menuItem.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          photoUrl: true,
          badge: true,
          spiceLevels: true,
          addOns: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true,
        },
      }),
    ]);

    if (menuItems.length > 0 || categories.length > 0) {
      const result = { menuItems, categories };

      if (!includeInactive) {
        setCachedMenu(result);
      }

      return NextResponse.json(result, {
        headers: { 'X-Cache': 'MISS' },
      });
    }

    // Fallback to memory store if DB returned empty
    const store = getMemoryStore();
    return NextResponse.json({
      menuItems: store.menuItems,
      categories: store.categories,
    });
  } catch (err) {
    console.warn('GET /api/menu falling back to static memory store:', err);
    const store = getMemoryStore();
    return NextResponse.json({
      menuItems: store.menuItems,
      categories: store.categories,
    });
  }
}

// POST /api/menu — create a new menu item (Admin only, Task E2 & E4)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Data menu tidak valid' }, { status: 400 });
    }

    const parsed = createMenuItemSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message || 'Data menu tidak valid';
      return NextResponse.json({ error: firstMsg }, { status: 400 });
    }

    const d = parsed.data;
    const cleanPhotoUrl = safeImageUrlOrEmpty(d.photoUrl);
    if (cleanPhotoUrl === null) {
      return NextResponse.json(
        { error: 'URL foto tidak valid. Gunakan protokol http:// atau https://.' },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        name: d.name,
        description: d.description,
        price: d.price,
        category: d.category,
        photoUrl: cleanPhotoUrl,
        badge: d.badge,
        spiceLevels: d.spiceLevels,
        addOns: d.addOns,
        isActive: d.isActive,
      },
    });

    invalidateMenuCache();

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal menambah menu' }, { status: 500 });
  }
}
