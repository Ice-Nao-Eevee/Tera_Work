import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { checkCouponRules } from '@/lib/coupon';

// POST /api/coupons/validate
// Validates a coupon code against current cart subtotal
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));

    const rawCode = String(body.code ?? '').trim().toUpperCase();
    const subtotal = Math.max(0, parseInt(String(body.subtotal ?? 0), 10) || 0);

    if (!rawCode) {
      return NextResponse.json(
        { valid: false, error: 'Silakan masukkan kode kupon.' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: rawCode },
    });

    const result = checkCouponRules(coupon as any, subtotal);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
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
