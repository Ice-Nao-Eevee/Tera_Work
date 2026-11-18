import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { isCouponAvailableToday, todayWIB } from '@/lib/coupon';

const createCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional().default(''),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().default('PERCENTAGE'),
    discountValue: z.union([z.number(), z.string()]),
    minOrderAmount: z.union([z.number(), z.string()]).optional().default(0),
    maxDiscountAmount: z.union([z.number(), z.string(), z.null()]).optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

// GET /api/admin/coupons - list all coupons for admin (Guarded)
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const usageDate = todayWIB();
    const coupons = await prisma.coupon.findMany({
      include: {
        usages: {
          where: { usageDate },
          select: { id: true, usageDate: true, deviceId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = coupons.map(({ usages, ...c }) => ({
      ...c,
      usedCountToday: usages.length,
      isAvailableToday: isCouponAvailableToday({ ...c, usages }),
    }));

    return NextResponse.json({ coupons: enriched });
  } catch (err) {
    console.warn('GET /api/admin/coupons error, returning empty list:', err);
    return NextResponse.json({ coupons: [] });
  }
}

// POST /api/admin/coupons - create new coupon (Guarded)
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const rawBody = await req.json().catch(() => null);
    const parsed = createCouponSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data kupon tidak valid atau mengandung field asing.' },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const code = String(body.code ?? '').trim().toUpperCase();
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const discountValue = Math.max(0, parseInt(String(body.discountValue ?? 0), 10) || 0);
    const minOrderAmount = Math.max(0, parseInt(String(body.minOrderAmount ?? 0), 10) || 0);
    const maxDiscountAmount =
      discountType === 'PERCENTAGE' &&
      body.maxDiscountAmount !== undefined &&
      body.maxDiscountAmount !== null &&
      body.maxDiscountAmount !== ''
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
  } catch (err) {
    console.error('POST /api/admin/coupons error:', err);
    return NextResponse.json(
      { error: 'Gagal membuat kupon' },
      { status: 500 }
    );
  }
}
