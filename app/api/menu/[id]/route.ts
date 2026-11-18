import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB, getMemoryStore } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { invalidateMenuCache } from '@/lib/menuCache';
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

const updateMenuItemSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama menu tidak boleh kosong').max(200).optional(),
    description: z.string().max(1000).optional(),
    price: z.coerce
      .number()
      .int()
      .min(0, 'Harga harus berupa angka dan tidak boleh negatif')
      .max(2147483647, 'Harga terlalu besar (maksimal Rp 2.147.483.647)')
      .optional(),
    category: z.string().trim().min(1).max(100).optional(),
    photoUrl: z
      .string()
      .max(2048)
      .optional()
      .refine((v) => v === undefined || safeImageUrlOrEmpty(v) !== null, {
        message: 'URL foto harus berupa URL http(s) yang valid.',
      }),
    badge: z.string().trim().max(50).optional(),
    spiceLevels: z.array(spiceLevelSchema).max(10).optional(),
    addOns: z.array(addOnSchema).max(30).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      const store = getMemoryStore();
      const fallbackItem = store.menuItems.find((m) => m.id === id || m._id === id);
      if (fallbackItem) return NextResponse.json({ item: fallbackItem });
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.warn('GET /api/menu/[id] error, falling back to memory store:', err);
    try {
      const { id } = await params;
      const store = getMemoryStore();
      const fallbackItem = store.menuItems.find((m) => m.id === id || m._id === id);
      if (fallbackItem) return NextResponse.json({ item: fallbackItem });
    } catch {}
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const { id } = await params;
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Data menu tidak valid' }, { status: 400 });
    }

    const parsed = updateMenuItemSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message || 'Data menu tidak valid';
      return NextResponse.json({ error: firstMsg }, { status: 400 });
    }

    const d = parsed.data;
    const cleanPhotoUrl =
      d.photoUrl !== undefined ? safeImageUrlOrEmpty(d.photoUrl) : undefined;
    if (cleanPhotoUrl === null) {
      return NextResponse.json(
        { error: 'URL foto tidak valid. Gunakan protokol http:// atau https://.' },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.price !== undefined && { price: d.price }),
        ...(d.category !== undefined && { category: d.category }),
        ...(cleanPhotoUrl !== undefined && { photoUrl: cleanPhotoUrl }),
        ...(d.badge !== undefined && { badge: d.badge }),
        ...(d.spiceLevels !== undefined && { spiceLevels: d.spiceLevels }),
        ...(d.addOns !== undefined && { addOns: d.addOns }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
      },
    });
    invalidateMenuCache();
    return NextResponse.json({ item });
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    console.error('PUT /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui menu' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const { id } = await params;
    await prisma.menuItem.delete({ where: { id } });
    invalidateMenuCache();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    console.error('DELETE /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus menu' }, { status: 500 });
  }
}
