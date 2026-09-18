import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { checkCouponRules } from '@/lib/coupon';

function generateOrderCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ARU-${num}`;
}

// GET /api/orders - list all orders, newest first
export async function GET() {
  try {
    await connectDB();
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

// POST /api/orders - create a new order (from customer checkout)
//
// SECURITY: All monetary values (subtotal, taxAmount, serviceChargeAmount, total)
// are RECALCULATED server-side from the database. Browser-supplied totals are
// completely ignored to prevent price manipulation attacks.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // ── Validate: items array must be non-empty ────────────────────────────
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Pesanan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // ── Validate: tableNumber must be a positive integer ──────────────────
    const tableNumber = parseInt(String(body.tableNumber ?? ''), 10);
    if (isNaN(tableNumber) || tableNumber < 1) {
      return NextResponse.json(
        { error: 'Nomor meja tidak valid. Harap masukkan nomor meja Anda.' },
        { status: 400 }
      );
    }

    // ── Batch fetch settings, menu items, and promos in parallel ───────
    const promoIds: string[] = Array.from(
      new Set(
        body.items
          .map((i: any) => String(i.menuItemId ?? ''))
          .filter((id: string) => id.startsWith('promo_'))
          .map((id: string) => id.replace(/^promo_/, ''))
      )
    );
    const regularIds: string[] = Array.from(
      new Set(
        body.items
          .map((i: any) => String(i.menuItemId ?? ''))
          .filter((id: string) => !id.startsWith('promo_') && id.length > 0)
      )
    );

    const [settings, dbMenuItems, dbPromos] = await Promise.all([
      prisma.settings.findFirst(),
      regularIds.length > 0
        ? prisma.menuItem.findMany({ where: { id: { in: regularIds } } })
        : [],
      promoIds.length > 0
        ? prisma.promo.findMany({ where: { id: { in: promoIds } } })
        : [],
    ]);

    const menuItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));
    const promoMap = new Map(dbPromos.map((p) => [p.id, p]));

    const taxRatePercent = settings?.taxRatePercent ?? 10;
    const serviceRatePercent = settings?.serviceChargeRatePercent ?? 5;

    // ── Recalculate all prices server-side ────────────────────────────────
    let subtotal = 0;
    const validatedItems: {
      menuItemId: string;
      name: string;
      qty: number;
      price: number;
      spiceLevel: string;
      addOns: { label: string; price: number }[];
      lineTotal: number;
    }[] = [];

    for (const rawItem of body.items) {
      const qty = Math.max(1, parseInt(String(rawItem.qty ?? 1), 10) || 1);
      const menuItemId = String(rawItem.menuItemId ?? '');

      if (menuItemId.startsWith('promo_')) {
        // ── Promo item: look up in pre-fetched map ──────────────────────────
        const promoId = menuItemId.replace(/^promo_/, '');
        const promo = promoMap.get(promoId);
        if (!promo || !promo.isActive) {
          return NextResponse.json(
            { error: `Promo "${rawItem.name || '(tidak dikenal)'}" sudah tidak tersedia.` },
            { status: 400 }
          );
        }
        const lineTotal = promo.discountedPrice * qty;
        subtotal += lineTotal;
        validatedItems.push({
          menuItemId,
          name: promo.title,
          qty,
          price: promo.discountedPrice,
          spiceLevel: '',
          addOns: [],
          lineTotal,
        });
      } else {
        // ── Regular menu item: look up in pre-fetched map ───────────────────
        const menuItem = menuItemMap.get(menuItemId);
        if (!menuItem || !menuItem.isActive) {
          return NextResponse.json(
            { error: `Menu "${rawItem.name || '(tidak dikenal)'}" tidak tersedia. Harap perbarui keranjang Anda.` },
            { status: 400 }
          );
        }

        // Validate add-ons against DB prices — browser prices are ignored
        const dbAddOns = (menuItem.addOns as { label: string; price: number }[]) || [];
        let addOnsTotal = 0;
        const validatedAddOns: { label: string; price: number }[] = [];

        if (Array.isArray(rawItem.addOns)) {
          for (const rawAddOn of rawItem.addOns) {
            const dbAddOn = dbAddOns.find((a) => a.label === rawAddOn.label);
            if (dbAddOn) {
              addOnsTotal += dbAddOn.price;
              validatedAddOns.push({ label: dbAddOn.label, price: dbAddOn.price });
            }
          }
        }

        const unitPrice = menuItem.price + addOnsTotal;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        validatedItems.push({
          menuItemId,
          name: menuItem.name,
          qty,
          price: unitPrice,
          spiceLevel: String(rawItem.spiceLevel || ''),
          addOns: validatedAddOns,
          lineTotal,
        });
      }
    }

    // ── Coupon Validation (Optional) ─────────────────────────────────────
    const rawCouponCode = body.couponCode
      ? String(body.couponCode).trim().toUpperCase()
      : null;
    let validatedCoupon: any = null;
    let discountAmount = 0;

    if (rawCouponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: rawCouponCode },
      });
      const couponCheck = checkCouponRules(coupon as any, subtotal);
      if (!couponCheck.valid) {
        return NextResponse.json(
          { error: couponCheck.error },
          { status: 400 }
        );
      }
      validatedCoupon = coupon;
      discountAmount = couponCheck.discountAmount;
    }

    // ── Compute tax / service / total server-side ─────────────────────────
    const taxAmount = Math.round((subtotal * taxRatePercent) / 100);
    const serviceChargeAmount = Math.round((subtotal * serviceRatePercent) / 100);
    const total = Math.max(0, subtotal - discountAmount + taxAmount + serviceChargeAmount);

    // ── Generate unique order code ────────────────────────────────────────
    let orderCode = generateOrderCode();
    for (let i = 0; i < 3; i++) {
      const existing = await prisma.order.findUnique({ where: { orderCode } });
      if (!existing) break;
      orderCode = generateOrderCode();
    }

    const now = new Date();

    // ── Create Order & Record Coupon Usage atomically in Transaction ──────
    const order = await prisma.$transaction(async (tx) => {
      if (validatedCoupon) {
        // Re-check coupon availability inside transaction to prevent race conditions
        const txCoupon = await tx.coupon.findUnique({
          where: { id: validatedCoupon.id },
        });
        const reCheck = checkCouponRules(txCoupon as any, subtotal);
        if (!reCheck.valid) {
          throw new Error(reCheck.error);
        }

        // Mark coupon as used today
        await tx.coupon.update({
          where: { id: validatedCoupon.id },
          data: {
            lastUsedDate: now,
            usedToday: true,
          },
        });
      }

      return tx.order.create({
        data: {
          orderCode,
          tableNumber,
          items: validatedItems,
          notes: String(body.notes ?? '').slice(0, 500),
          subtotal,
          taxAmount,
          serviceChargeAmount,
          couponCode: validatedCoupon ? validatedCoupon.code : null,
          discountAmount,
          total,
          status: 'received',
        },
      });
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membuat pesanan' },
      { status: 500 }
    );
  }
}
