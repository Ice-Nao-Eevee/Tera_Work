import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { invalidateMenuCache } from '@/lib/menuCache';

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100),
    slug: z.string().trim().max(100).optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .strict();

// GET /api/categories — list all categories sorted by sortOrder
export async function GET() {
  try {
    await connectDB();
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 });
  }
}

// POST /api/categories — create a new category (Admin only, Task E4)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Data kategori tidak valid' }, { status: 400 });
    }

    const parsed = createCategorySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data kategori tidak valid' },
        { status: 400 }
      );
    }

    const { name } = parsed.data;
    const slug =
      parsed.data.slug && parsed.data.slug.length > 0
        ? parsed.data.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sortOrder =
      parsed.data.sortOrder !== undefined
        ? parsed.data.sortOrder
        : await prisma.category.count();

    const category = await prisma.category.create({
      data: { name, slug, sortOrder },
    });
    invalidateMenuCache();
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal menambah kategori' }, { status: 500 });
  }
}
