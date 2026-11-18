import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdmin, verifyCsrfOrigin } from '@/lib/adminGuard';
import { checkCouponRules, normalizeCouponCode, todayWIB } from '@/lib/coupon';
import { connectDB } from '@/lib/db';
import {
  checkCouponRateLimit,
  checkOrderRateLimit,
  getClientIp,
} from '@/lib/ratelimit';
import { getDeviceIdFromCookie, getTableFromCookie } from '@/lib/tableToken';
import { verifyTurnstileToken } from '@/lib/turnstile';

const PENDING_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ACTIVE_ORDERS_PER_TABLE = 2;

class OrderDomainError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function generateOrderCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ARU-${num}`;
}

const orderItemAddOnSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    price: z.unknown().optional(), // browser price ignored
  })
  .strict();

const orderItemInputSchema = z
  .object({
    menuId: z.string().trim().min(1).max(128).optional(),
    menuItemId: z.string().trim().min(1).max(128).optional(),
    qty: z.number().int().min(1).max(20),
    spiceLevel: z.string().trim().max(50).optional(),
    addOns: z.array(orderItemAddOnSchema).max(20).optional(),
    // Browser-supplied display/monetary fields are accepted ONLY to be ignored:
    name: z.string().max(200).optional(),
    price: z.unknown().optional(),
    unitPrice: z.unknown().optional(),
    lineTotal: z.unknown().optional(),
  })
  .strict()
  .refine((item) => Boolean(item.menuId || item.menuItemId), {
    message: 'ID menu wajib diisi.',
  });

const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1).max(30),
    couponCode: z.string().trim().max(64).optional().nullable(),
    notes: z.string().max(200).optional().default(''),
    paymentMethod: z.enum(['cash', 'qris']).optional().default('cash'),
    turnstileToken: z.string().max(4096).optional().nullable(),
    website: z.string().max(256).optional(),
    // Browser-supplied totals/statuses are ignored server-side:
    price: z.unknown().optional(),
    subtotal: z.unknown().optional(),
    discount: z.unknown().optional(),
    discountAmount: z.unknown().optional(),
    taxAmount: z.unknown().optional(),
    serviceChargeAmount: z.unknown().optional(),
    total: z.unknown().optional(),
    paymentStatus: z.unknown().optional(),
  })
  .strict();

// GET /api/orders - list all orders, newest first (Admin only)
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();

    // Auto-cancel pending orders older than 15 minutes
    const staleCutoff = new Date(Date.now() - PENDING_EXPIRY_MS);
    await prisma.order.updateMany({
      where: {
        status: 'pending',
        createdAt: { lt: staleCutoff },
      },
      data: { status: 'cancelled' },
    });

    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ orders });
  } catch (err) {
    console.warn('GET /api/orders error, returning empty list:', err);
    return NextResponse.json({ orders: [] });
  }
}

// POST /api/orders - create a new order (from customer checkout)
export async function POST(req: NextRequest) {
  const csrfDenied = verifyCsrfOrigin(req);
  if (csrfDenied) return csrfDenied;

  try {
    await connectDB();

    // Reject any attempt to pass ?meja= or ?table= in query string
    if (req.nextUrl.searchParams.has('meja') || req.nextUrl.searchParams.has('table')) {
      return NextResponse.json(
        { error: 'Parameter meja pada URL tidak diizinkan. Silakan scan QR meja Anda.' },
        { status: 400 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json(
        { error: 'Data pesanan tidak valid.' },
        { status: 400 }
      );
    }

    // ── Honeypot check (Task C5): reject silently/generically if filled ──
    if (typeof (rawBody as any).website === 'string' && (rawBody as any).website.trim().length > 0) {
      return NextResponse.json(
        { error: 'Permintaan tidak dapat diproses.' },
        { status: 400 }
      );
    }

    // ── Resolve table strictly from the QR httpOnly cookie (Task C1) ──
    const table = await getTableFromCookie();
    if (!table) {
      return NextResponse.json(
        { error: 'Meja tidak terdeteksi. Silakan scan QR yang ada di meja Anda.' },
        { status: 400 }
      );
    }

    // ── Rate limit: 5 orders per minute per IP + table token (Task C4) ──
    const orderRateLimited = await checkOrderRateLimit(req, table.qrToken);
    if (orderRateLimited) return orderRateLimited;

    // ── Strict Zod validation (Task A2) ──
    const parsed = createOrderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pesanan tidak valid. Periksa kembali jumlah item dan catatan Anda.' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ── Anti-bot Cloudflare Turnstile verification (Task C5) ──
    const turnstileResult = await verifyTurnstileToken(
      data.turnstileToken,
      getClientIp(req)
    );
    if (!turnstileResult.ok) {
      return NextResponse.json(
        { error: turnstileResult.error || 'Verifikasi keamanan gagal.' },
        { status: 400 }
      );
    }

    const normalizedCoupon = normalizeCouponCode(data.couponCode);
    if (normalizedCoupon) {
      const couponRateLimited = await checkCouponRateLimit(req);
      if (couponRateLimited) return couponRateLimited;
    }

    const deviceId = await getDeviceIdFromCookie(table.id);

    // Separate regular menu IDs and promo IDs
    const requestedIds = data.items.map((i) => (i.menuId || i.menuItemId || '').trim());
    const uniqueIds = Array.from(new Set(requestedIds));
    if (uniqueIds.length > 30) {
      return NextResponse.json(
        { error: 'Jumlah menu unik per pesanan maksimal 30 item.' },
        { status: 400 }
      );
    }

    const promoIds = uniqueIds
      .filter((id) => id.startsWith('promo_'))
      .map((id) => id.replace(/^promo_/, ''));
    const regularIds = uniqueIds.filter((id) => !id.startsWith('promo_'));

    // Plain-text sanitization for notes (max 200 chars, strip control chars)
    const cleanNotes = String(data.notes || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 200);

    const usageDate = todayWIB();
    const staleCutoff = new Date(Date.now() - PENDING_EXPIRY_MS);

    // 1. Auto-cancel stale pending orders (> 15 minutes) on this table and fetch authoritative pricing data in parallel
    const [, settings, dbMenuItems, dbPromos, dbCoupon] = await Promise.all([
      prisma.order.updateMany({
        where: {
          tableId: table.id,
          status: 'pending',
          createdAt: { lt: staleCutoff },
        },
        data: { status: 'cancelled' },
      }),
      prisma.settings.findFirst(),
      regularIds.length > 0
        ? prisma.menuItem.findMany({
            where: { id: { in: regularIds }, isActive: true },
          })
        : Promise.resolve([]),
      promoIds.length > 0
        ? prisma.promo.findMany({
            where: { id: { in: promoIds }, isActive: true },
          })
        : Promise.resolve([]),
      normalizedCoupon
        ? prisma.coupon.findUnique({
            where: { code: normalizedCoupon },
          })
        : Promise.resolve(null),
    ]);

    const menuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));
    const promoMap = new Map(dbPromos.map((p) => [p.id, p]));

    let subtotal = 0;
    const validatedItems: {
      menuItemId: string;
      name: string;
      qty: number;
      unitPrice: number;
      price: number;
      spiceLevel: string;
      addOns: { label: string; price: number }[];
      lineTotal: number;
    }[] = [];

    for (const rawItem of data.items) {
      const itemId = (rawItem.menuId || rawItem.menuItemId || '').trim();
      const qty = rawItem.qty;

      if (itemId.startsWith('promo_')) {
        const promoId = itemId.replace(/^promo_/, '');
        const promo = promoMap.get(promoId);
        if (!promo || !promo.isActive) {
          throw new OrderDomainError('Promo yang dipilih tidak tersedia.', 400);
        }
        const unitPrice = promo.discountedPrice;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        validatedItems.push({
          menuItemId: `promo_${promo.id}`,
          name: promo.title,
          qty,
          unitPrice,
          price: unitPrice,
          spiceLevel: '',
          addOns: [],
          lineTotal,
        });
      } else {
        const menuItem = menuItemMap.get(itemId);
        if (!menuItem || !menuItem.isActive) {
          throw new OrderDomainError(
            'Menu yang dipilih tidak valid atau sedang tidak tersedia.',
            400
          );
        }

        const dbAddOns =
          (menuItem.addOns as { label: string; price: number }[]) || [];
        let addOnsTotal = 0;
        const validatedAddOns: { label: string; price: number }[] = [];

        if (Array.isArray(rawItem.addOns)) {
          for (const rawAddOn of rawItem.addOns) {
            const dbAddOn = dbAddOns.find((a) => a.label === rawAddOn.label);
            if (dbAddOn) {
              addOnsTotal += dbAddOn.price;
              validatedAddOns.push({
                label: dbAddOn.label,
                price: dbAddOn.price,
              });
            }
          }
        }

        const unitPrice = menuItem.price + addOnsTotal;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        validatedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          qty,
          unitPrice,
          price: unitPrice,
          spiceLevel: String(rawItem.spiceLevel || '').slice(0, 50),
          addOns: validatedAddOns,
          lineTotal,
        });
      }
    }

    // Validate coupon rules (Task A4)
    let validatedCoupon: { id: string; code: string } | null = null;
    let discountAmount = 0;

    if (normalizedCoupon) {
      const couponCheck = checkCouponRules(dbCoupon as any, subtotal);
      if (!couponCheck.valid || !dbCoupon) {
        throw new OrderDomainError(couponCheck.error || 'Kupon tidak valid', 400);
      }
      validatedCoupon = { id: dbCoupon.id, code: dbCoupon.code };
      discountAmount = couponCheck.discountAmount;
    }

    const taxRatePercent = settings?.taxRatePercent ?? 10;
    const serviceRatePercent = settings?.serviceChargeRatePercent ?? 5;
    const taxAmount = Math.round((subtotal * taxRatePercent) / 100);
    const serviceChargeAmount = Math.round((subtotal * serviceRatePercent) / 100);
    const total = Math.max(
      0,
      subtotal - discountAmount + taxAmount + serviceChargeAmount
    );

    // ── Atomic Transaction: Active Order Limit + Order Creation + CouponUsage (Task A4 & C3) ──
    const order = await prisma.$transaction(
      async (tx) => {
        // Enforce max 2 active orders per table (Task C3)
        const activeOrdersCount = await tx.order.count({
          where: {
            tableId: table.id,
            status: { notIn: ['completed', 'cancelled'] },
          },
        });
        if (activeOrdersCount >= MAX_ACTIVE_ORDERS_PER_TABLE) {
          throw new OrderDomainError(
            'Meja ini masih memiliki 2 pesanan aktif. Silakan tunggu pesanan selesai atau hubungi kasir.',
            429
          );
        }

        // Generate unique orderCode for human-readable receipt display
        let orderCode = generateOrderCode();
        for (let i = 0; i < 5; i++) {
          const existing = await tx.order.findUnique({ where: { orderCode } });
          if (!existing) break;
          orderCode = generateOrderCode();
        }

        // Create Order (initial status is ALWAYS 'pending' awaiting cashier confirmation, paymentStatus is ALWAYS 'unpaid')
        const createdOrder = await tx.order.create({
          data: {
            orderCode,
            tableNumber: table.tableNumber,
            tableId: table.id,
            items: validatedItems,
            notes: cleanNotes,
            subtotal,
            taxAmount,
            serviceChargeAmount,
            couponCode: validatedCoupon ? validatedCoupon.code : null,
            discountAmount,
            total,
            status: 'pending',
            paymentMethod: data.paymentMethod || 'cash',
            paymentStatus: 'unpaid',
          },
        });

        // Record CouponUsage atomically — DB unique constraint enforces 1x/day WIB
        if (validatedCoupon) {
          await tx.couponUsage.create({
            data: {
              couponId: validatedCoupon.id,
              deviceId,
              usageDate,
              orderId: createdOrder.id,
            },
          });
          await tx.coupon.update({
            where: { id: validatedCoupon.id },
            data: {
              lastUsedDate: new Date(),
              usedToday: true,
            },
          });
        }

        return createdOrder;
      },
      { maxWait: 15000, timeout: 20000 }
    );

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderCode: order.orderCode,
          tableNumber: order.tableNumber,
          items: order.items,
          notes: order.notes,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          serviceChargeAmount: order.serviceChargeAmount,
          couponCode: order.couponCode,
          discountAmount: order.discountAmount,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (
      (err instanceof Prisma.PrismaClientKnownRequestError || err?.code === 'P2002') &&
      err.code === 'P2002'
    ) {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(',')
        : String(err.meta?.target || '');
      const modelName = String(err.meta?.modelName || '');
      const msg = String(err.message || '');
      if (
        modelName === 'CouponUsage' ||
        target.includes('couponId') ||
        target.includes('usageDate') ||
        target.includes('coupon_usages') ||
        msg.includes('coupon_usages') ||
        msg.includes('couponId')
      ) {
        return NextResponse.json(
          { error: 'Kupon sudah dipakai hari ini' },
          { status: 409 }
        );
      }
    }

    if (err instanceof OrderDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: 'Gagal membuat pesanan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
