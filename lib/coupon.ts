import { formatRupiah } from './format';

export interface CouponData {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  lastUsedDate?: Date | string | null;
  usedToday?: boolean;
}

/**
 * Checks if a coupon can be used today based on calendar day.
 * Resets automatically each new calendar day without any background cron job.
 */
export function isCouponAvailableToday(coupon: {
  lastUsedDate?: Date | string | null;
}): boolean {
  if (!coupon.lastUsedDate) return true;

  const lastUsed = new Date(coupon.lastUsedDate);
  const now = new Date();

  // If used on the same calendar day, it is unavailable
  return lastUsed.toDateString() !== now.toDateString();
}

/**
 * Calculates discount amount based on subtotal (before tax and service charge).
 */
export function calculateDiscount(
  coupon: {
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number | null;
  },
  subtotal: number
): number {
  if (subtotal <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
  } else {
    // FIXED
    discount = coupon.discountValue;
  }

  // Ensure discount does not exceed subtotal and is not negative
  return Math.max(0, Math.min(discount, subtotal));
}

export type CouponValidationResult =
  | {
      valid: true;
      coupon: CouponData;
      discountAmount: number;
      error?: never;
    }
  | {
      valid: false;
      error: string;
      coupon?: never;
      discountAmount?: never;
    };

/**
 * Validates a coupon code against business rules.
 */
export function checkCouponRules(
  coupon: CouponData | null,
  subtotal: number
): CouponValidationResult {
  if (!coupon || !coupon.isActive) {
    return {
      valid: false,
      error: 'Kupon tidak ditemukan atau tidak aktif.',
    };
  }

  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  if (now < start) {
    return {
      valid: false,
      error: 'Kupon belum dapat digunakan (periode belum dimulai).',
    };
  }

  if (now > end) {
    return {
      valid: false,
      error: 'Kupon sudah kedaluwarsa.',
    };
  }

  if (!isCouponAvailableToday(coupon)) {
    return {
      valid: false,
      error: 'Kupon ini sudah dipakai hari ini. Silakan coba lagi besok!',
    };
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimal pesanan untuk menggunakan kupon ini adalah ${formatRupiah(
        coupon.minOrderAmount
      )} (subtotal pesanan saat ini: ${formatRupiah(subtotal)}).`,
    };
  }

  const discountAmount = calculateDiscount(coupon, subtotal);

  return {
    valid: true,
    coupon,
    discountAmount,
  };
}
