import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';

const createPromoSchema = z
  .object({
    title: z.string().trim().min(1, 'Judul promo wajib diisi').max(200),
    description: z.string().trim().max(1000).optional().default(''),
    originalPrice: z.coerce.number().int().min(0).max(2147483647),
    discountedPrice: z.coerce.number().int().min(0).max(2147483647),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

// GET /api/promos
export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('all') === 'true';
    if (includeInactive) {
      const denied = requireAdmin(req);
      if (denied) return denied;
    }

    await connectDB();
    const promos = await prisma.promo.findMany({
      where: includeInactive ? undefined : { isActive: true },
    });
    return NextResponse.json({ promos });
  } catch (err) {
    console.error('GET /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal memuat promo' }, { status: 500 });
  }
}

// POST /api/promos (Admin only, Task E4)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Data promo tidak valid' }, { status: 400 });
    }

    const parsed = createPromoSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data promo tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const promo = await prisma.promo.create({
      data: {
        title: d.title,
        description: d.description,
        originalPrice: d.originalPrice,
        discountedPrice: d.discountedPrice,
        isActive: d.isActive,
      },
    });
    return NextResponse.json({ promo }, { status: 201 });
  } catch (err) {
    console.error('POST /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal menambah promo' }, { status: 500 });
  }
}
