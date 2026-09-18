import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { isCouponAvailableToday } from '@/lib/coupon';

// GET /api/admin/coupons - list all coupons for admin
export async function GET() {
  try {
    await connectDB();
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const enriched = coupons.map((c) => ({
      ...c,
      isAvailableToday: isCouponAvailableToday(c),
    }));

    return NextResponse.json({ coupons: enriched });
  } catch (err) {
    console.error('GET /api/admin/coupons error:', err);
    return NextResponse.json(
      { error: 'Gagal memuat data kupon' },
      { status: 500 }
    );
  }
}

// POST /api/admin/coupons - create new coupon
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    const code = String(body.code ?? '').trim().toUpperCase();
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const discountValue = Math.max(0, parseInt(String(body.discountValue ?? 0), 10) || 0);
    const minOrderAmount = Math.max(0, parseInt(String(body.minOrderAmount ?? 0), 10) || 0);
    const maxDiscountAmount =
      discountType === 'PERCENTAGE' && body.maxDiscountAmount !== undefined && body.maxDiscountAmount !== null && body.maxDiscountAmount !== ''
        ? Math.max(0, parseInt(String(body.maxDiscountAmount), 10) || 0)
        : null;

    if (!code) {
      return NextResponse.json(
        { error: 'Kode kupon wajib diisi.' },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: 'Judul kupon wajib diisi.' },
        { status: 400 }
      );
    }
    if (discountValue <= 0) {
      return NextResponse.json(
        { error: 'Nilai diskon harus lebih besar dari 0.' },
        { status: 400 }
      );
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json(
        { error: 'Diskon persentase tidak boleh melebihi 100%.' },
        { status: 400 }
      );
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Tanggal mulai dan berakhir wajib ditentukan.' },
        { status: 400 }
      );
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Format tanggal tidak valid.' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'Tanggal berakhir tidak boleh mendahului tanggal mulai.' },
        { status: 400 }
      );
    }

    // Check duplicate code
    const existing = await prisma.coupon.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Kode kupon "${code}" sudah digunakan.` },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        title,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        startDate,
        endDate,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/admin/coupons error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membuat kupon' },
      { status: 500 }
    );
  }
}
