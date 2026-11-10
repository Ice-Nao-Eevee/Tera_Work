import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';

const updateCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(64).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.union([z.number(), z.string()]).optional(),
    minOrderAmount: z.union([z.number(), z.string()]).optional(),
    maxDiscountAmount: z.union([z.number(), z.string(), z.null()]).optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

interface Params {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/coupons/[id] - Update coupon details (Guarded)
export async function PUT(req: NextRequest, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    const parsed = updateCouponSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pembaruan kupon tidak valid.' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kupon tidak ditemukan.' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ error: 'Kode kupon tidak boleh kosong.' }, { status: 400 });
      }
      if (code !== existing.code) {
        const dup = await prisma.coupon.findUnique({ where: { code } });
        if (dup) {
          return NextResponse.json({ error: `Kode kupon "${code}" sudah dipakai.` }, { status: 400 });
        }
      }
      dataToUpdate.code = code;
    }

    if (body.title !== undefined) dataToUpdate.title = String(body.title).trim();
    if (body.description !== undefined) dataToUpdate.description = String(body.description).trim();
    if (body.discountType !== undefined) {
      dataToUpdate.discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    }
    if (body.discountValue !== undefined) {
      dataToUpdate.discountValue = Math.max(0, parseInt(String(body.discountValue), 10) || 0);
    }
    if (body.minOrderAmount !== undefined) {
      dataToUpdate.minOrderAmount = Math.max(0, parseInt(String(body.minOrderAmount), 10) || 0);
    }
    if (body.maxDiscountAmount !== undefined) {
      dataToUpdate.maxDiscountAmount =
        body.maxDiscountAmount !== null && body.maxDiscountAmount !== ''
          ? Math.max(0, parseInt(String(body.maxDiscountAmount), 10) || 0)
          : null;
    }
    if (body.startDate !== undefined) dataToUpdate.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) dataToUpdate.endDate = new Date(body.endDate);
    if (body.isActive !== undefined) dataToUpdate.isActive = Boolean(body.isActive);

    const updated = await prisma.coupon.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ coupon: updated });
  } catch (err) {
    console.error('PUT /api/admin/coupons/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kupon' }, { status: 500 });
  }
}

// PATCH /api/admin/coupons/[id] - Toggle active or quick update (Guarded)
export async function PATCH(req: NextRequest, { params }: Params) {
  return PUT(req, { params });
}

// DELETE /api/admin/coupons/[id] - Soft delete (set isActive = false) (Guarded)
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  try {
    await connectDB();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kupon tidak ditemukan.' }, { status: 404 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Kupon dinonaktifkan (soft delete).',
      coupon: updated,
    });
  } catch (err) {
    console.error('DELETE /api/admin/coupons/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menonaktifkan kupon' }, { status: 500 });
  }
}
