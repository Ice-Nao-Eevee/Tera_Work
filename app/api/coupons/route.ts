import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { todayWIB } from '@/lib/coupon';
import { getDeviceIdFromCookie, getTableFromCookie } from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

// GET /api/coupons - returns active coupons currently valid and available today (WIB) for this device
export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const usageDate = todayWIB();
    const table = await getTableFromCookie();
    const deviceId = await getDeviceIdFromCookie(table?.id);

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        usages: {
          where: {
            usageDate,
            deviceId,
          },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out coupons already used today by this device and strip internal fields
    const availableToday = coupons
      .filter((c) => c.usages.length === 0)
      .map(({ usages, lastUsedDate, usedToday, ...publicCoupon }) => publicCoupon);

    return NextResponse.json({ coupons: availableToday });
  } catch (err) {
    console.warn('GET /api/coupons error, returning empty list:', err);
    return NextResponse.json({ coupons: [] });
  }
}
