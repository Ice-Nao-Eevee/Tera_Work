import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { invalidateMenuCache } from '@/lib/menuCache';

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: z.string().trim().min(1).max(100).optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .strict();

// PUT /api/categories/[id] — update a category (Admin only, Task E4)
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
      return NextResponse.json({ error: 'Data kategori tidak valid' }, { status: 400 });
    }

    const parsed = updateCategorySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data kategori tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.slug !== undefined && { slug: d.slug }),
        ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
      },
    });
    invalidateMenuCache();
    return NextResponse.json({ category });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    console.error('PUT /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete a category (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    invalidateMenuCache();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 });
  }
}
