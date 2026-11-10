import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { checkCouponRules, normalizeCouponCode, todayWIB } from '@/lib/coupon';
import { checkCouponRateLimit } from '@/lib/ratelimit';
import { getDeviceIdFromCookie, getTableFromCookie } from '@/lib/tableToken';
import { verifyCsrfOrigin } from '@/lib/adminGuard';

const validateCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    subtotal: z.number().int().min(0).optional().default(0),
  })
  .strict();

// POST /api/coupons/validate
// Validates a coupon code against current cart subtotal
export async function POST(req: NextRequest) {
  const csrfDenied = verifyCsrfOrigin(req);
  if (csrfDenied) return csrfDenied;

  try {
    // Rate limit: 10 requests per minute per IP (Task C4)
    const rateLimited = await checkCouponRateLimit(req);
    if (rateLimited) return rateLimited;

    await connectDB();
    const rawBody = await req.json().catch(() => null);
    const parsed = validateCouponSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: 'Kupon tidak valid' },
        { status: 400 }
      );
    }

    const rawCode = normalizeCouponCode(parsed.data.code);
    const subtotal = parsed.data.subtotal;

    if (!rawCode) {
      return NextResponse.json(
        { valid: false, error: 'Kupon tidak valid' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: rawCode },
    });

    const result = checkCouponRules(coupon as any, subtotal);
    if (!result.valid || !coupon) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    // Check if already used today (WIB) by this device/table
    const table = await getTableFromCookie();
    const deviceId = await getDeviceIdFromCookie(table?.id);
    const usageToday = await prisma.couponUsage.findUnique({
      where: {
        couponId_deviceId_usageDate: {
          couponId: coupon.id,
          deviceId,
          usageDate: todayWIB(),
        },
      },
    });

    if (usageToday) {
      return NextResponse.json(
        { valid: false, error: 'Kupon sudah dipakai hari ini' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.coupon.id,
        code: result.coupon.code,
        title: result.coupon.title,
        description: result.coupon.description,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        minOrderAmount: result.coupon.minOrderAmount,
        maxDiscountAmount: result.coupon.maxDiscountAmount,
      },
      discountAmount: result.discountAmount,
    });
  } catch (err) {
    console.error('POST /api/coupons/validate error:', err);
    return NextResponse.json(
      { valid: false, error: 'Gagal memvalidasi kupon. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
