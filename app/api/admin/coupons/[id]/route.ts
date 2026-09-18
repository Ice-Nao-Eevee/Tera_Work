import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

interface Params {
  params: { id: string };
}

// PUT /api/admin/coupons/[id] - Update coupon details
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = params;
    const body = await req.json().catch(() => ({}));

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
  } catch (err: any) {
    console.error(`PUT /api/admin/coupons/${params.id} error:`, err);
    return NextResponse.json({ error: err.message || 'Gagal memperbarui kupon' }, { status: 500 });
  }
}

// PATCH /api/admin/coupons/[id] - Toggle active or quick update
export async function PATCH(req: NextRequest, { params }: Params) {
  return PUT(req, { params });
}

// DELETE /api/admin/coupons/[id] - Soft delete (set isActive = false)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = params;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kupon tidak ditemukan.' }, { status: 404 });
    }

    // Soft delete per business rule constraint
    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Kupon dinonaktifkan (soft delete).',
      coupon: updated,
    });
  } catch (err: any) {
    console.error(`DELETE /api/admin/coupons/${params.id} error:`, err);
    return NextResponse.json({ error: err.message || 'Gagal menonaktifkan kupon' }, { status: 500 });
  }
}
