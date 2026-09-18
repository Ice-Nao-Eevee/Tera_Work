import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { isCouponAvailableToday } from '@/lib/coupon';

// GET /api/coupons - returns active coupons currently valid and available today
export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out coupons that were already used today
    const availableToday = coupons.filter((c) => isCouponAvailableToday(c));

    return NextResponse.json({ coupons: availableToday });
  } catch (err) {
    console.error('GET /api/coupons error:', err);
    return NextResponse.json(
      { error: 'Gagal memuat kupon' },
      { status: 500 }
    );
  }
}
