import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

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

    // ── Fetch tax/service rates from DB (server-authoritative) ───────────
    const settings = await prisma.settings.findFirst();
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
        // ── Promo item: look up in promos table ──────────────────────────
        const promoId = menuItemId.replace(/^promo_/, '');
        const promo = await prisma.promo.findUnique({ where: { id: promoId } });
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
        // ── Regular menu item: look up in menu_items table ───────────────
        const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
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

    // ── Compute tax / service / total server-side ─────────────────────────
    const taxAmount = Math.round((subtotal * taxRatePercent) / 100);
    const serviceChargeAmount = Math.round((subtotal * serviceRatePercent) / 100);
    const total = subtotal + taxAmount + serviceChargeAmount;

    // ── Generate unique order code ────────────────────────────────────────
    let orderCode = generateOrderCode();
    for (let i = 0; i < 3; i++) {
      const existing = await prisma.order.findUnique({ where: { orderCode } });
      if (!existing) break;
      orderCode = generateOrderCode();
    }

    const order = await prisma.order.create({
      data: {
        orderCode,
        tableNumber,
        items: validatedItems,
        notes: String(body.notes ?? '').slice(0, 500),
        subtotal,
        taxAmount,
        serviceChargeAmount,
        total,
        status: 'received',
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 });
  }
}
