import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';

const updatePromoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    originalPrice: z.coerce.number().int().min(0).max(2147483647).optional(),
    discountedPrice: z.coerce.number().int().min(0).max(2147483647).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// PUT /api/promos/[id] — update a promo (Admin only, Task E4)
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
      return NextResponse.json({ error: 'Data promo tidak valid' }, { status: 400 });
    }

    const parsed = updatePromoSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data promo tidak valid' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const promo = await prisma.promo.update({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.originalPrice !== undefined && { originalPrice: d.originalPrice }),
        ...(d.discountedPrice !== undefined && { discountedPrice: d.discountedPrice }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
      },
    });
    return NextResponse.json({ promo });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
    console.error('PUT /api/promos/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui promo' }, { status: 500 });
  }
}

// DELETE /api/promos/[id] — delete a promo (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const { id } = await params;
    await prisma.promo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/promos/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus promo' }, { status: 500 });
  }
}
