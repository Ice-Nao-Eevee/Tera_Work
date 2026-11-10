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
 * Returns current calendar date in Asia/Jakarta (WIB) formatted as "YYYY-MM-DD".
 */
export function todayWIB(): string {
  // en-CA produces YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * Formats any Date/string into "YYYY-MM-DD" in Asia/Jakarta (WIB).
 */
export function formatDateWIB(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(date));
}

/**
 * Normalizes a coupon code (trim + uppercase).
 */
export function normalizeCouponCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase();
}

/**
 * Checks if a coupon can be used today based on WIB calendar day.
 * Resets automatically each new calendar day in Asia/Jakarta without any cron job.
 */
export function isCouponAvailableToday(
  coupon: {
    lastUsedDate?: Date | string | null;
    usages?: { usageDate: string; deviceId?: string }[];
  },
  deviceId?: string
): boolean {
  const today = todayWIB();

  if (Array.isArray(coupon.usages)) {
    if (deviceId) {
      return !coupon.usages.some((u) => u.usageDate === today && u.deviceId === deviceId);
    }
    return !coupon.usages.some((u) => u.usageDate === today);
  }

  if (!coupon.lastUsedDate) return true;
  try {
    return formatDateWIB(coupon.lastUsedDate) !== today;
  } catch {
    return true;
  }
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
 * Error messages for missing, inactive, not-yet-started, or expired coupons
 * are intentionally uniform ("Kupon tidak valid") to prevent enumeration.
 */
export function checkCouponRules(
  coupon: CouponData | null,
  subtotal: number
): CouponValidationResult {
  if (!coupon || !coupon.isActive) {
    return {
      valid: false,
      error: 'Kupon tidak valid',
    };
  }

  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  if (now < start || now > end) {
    return {
      valid: false,
      error: 'Kupon tidak valid',
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
