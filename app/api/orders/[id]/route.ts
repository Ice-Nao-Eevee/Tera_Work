import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';

const ALLOWED_STATUSES = new Set([
  'pending',
  'received',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]);

const patchOrderItemAddOnSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    price: z.number().min(0).max(10_000_000),
  })
  .strict();

const patchOrderItemSchema = z
  .object({
    menuItemId: z.string().max(128).optional(),
    menuId: z.string().max(128).optional(),
    name: z.string().trim().min(1).max(200),
    qty: z.number().int().min(1).max(20),
    unitPrice: z.number().min(0).max(10_000_000).optional(),
    price: z.number().min(0).max(10_000_000).optional(),
    lineTotal: z.number().min(0).max(100_000_000).optional(),
    spiceLevel: z.string().max(50).optional(),
    addOns: z.array(patchOrderItemAddOnSchema).max(20).optional(),
  })
  .strict();

const patchOrderSchema = z
  .object({
    status: z.string().trim().max(32).optional(),
    paymentStatus: z.string().trim().max(32).optional(),
    paymentMethod: z.string().trim().max(32).optional(),
    items: z.array(patchOrderItemSchema).min(1).max(30).optional(),
  })
  .strict();

// GET /api/orders/[id] — fetch a single order by its unguessable cuid `id` (Task B1)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id).trim();

  try {
    await connectDB();

    const isAdmin = requireAdmin(req) === null;

    // Public endpoints MUST NOT resolve sequential/short orderCode (e.g. ARU-1234)
    if (!isAdmin && /^ARU-\d+$/i.test(decodedId)) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const order = await prisma.order.findFirst({
      where: isAdmin
        ? { OR: [{ id: decodedId }, { orderCode: decodedId }] }
        : { id: decodedId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Return only customer-necessary fields (no internal relations/metadata)
    return NextResponse.json({
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
    });
  } catch (err) {
    console.error('GET /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — update order status and/or items (Admin only, Task B2)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const decodedId = decodeURIComponent(id).trim();
  try {
    await connectDB();
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: decodedId }, { orderCode: decodedId }] },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = patchOrderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data pembaruan pesanan tidak valid.' },
        { status: 400 }
      );
    }
    const { status, items, paymentStatus, paymentMethod } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (!ALLOWED_STATUSES.has(normalizedStatus)) {
        return NextResponse.json({ error: 'Status pesanan tidak valid' }, { status: 400 });
      }
      updateData.status = normalizedStatus;
    }
    if (paymentStatus !== undefined) {
      const normalizedPay = String(paymentStatus).trim().toLowerCase();
      if (!['paid', 'unpaid'].includes(normalizedPay)) {
        return NextResponse.json({ error: 'Status pembayaran tidak valid' }, { status: 400 });
      }
      updateData.paymentStatus = normalizedPay;
    }
    if (paymentMethod !== undefined) {
      const normalizedMethod = String(paymentMethod).trim().toLowerCase();
      if (!['cash', 'qris'].includes(normalizedMethod)) {
        return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 });
      }
      updateData.paymentMethod = normalizedMethod;
    }

    // If items are provided, recalculate totals and preserve unitPrice snapshot
    if (Array.isArray(items) && items.length > 0) {
      const settings = await prisma.settings.findFirst();
      const taxRate = settings?.taxRatePercent ?? 10;
      const serviceRate = settings?.serviceChargeRatePercent ?? 5;

      const normalizedItems = items.map((item: any) => {
        const unitPrice = Math.max(0, Number(item.unitPrice ?? item.price) || 0);
        const qty = Math.max(1, Math.min(20, Math.round(Number(item.qty) || 1)));
        const lineTotal = unitPrice * qty;
        return {
          ...item,
          name: String(item.name || '').trim(),
          qty,
          unitPrice,
          price: unitPrice,
          lineTotal,
        };
      });

      const subtotal = normalizedItems.reduce((sum: number, it: { lineTotal: number }) => sum + it.lineTotal, 0);
      const taxAmount = Math.round((subtotal * taxRate) / 100);
      const serviceChargeAmount = Math.round((subtotal * serviceRate) / 100);
      const discountAmount = Math.min(existing.discountAmount || 0, subtotal);
      const total = Math.max(0, subtotal - discountAmount + taxAmount + serviceChargeAmount);

      updateData.items = normalizedItems;
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.serviceChargeAmount = serviceChargeAmount;
      updateData.discountAmount = discountAmount;
      updateData.total = total;
    }

    const order = await prisma.order.update({
      where: { id: existing.id },
      data: updateData,
    });
    return NextResponse.json({ order });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    console.error('PATCH /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status pesanan' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] — delete an order (Admin only, Task B2)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const decodedId = decodeURIComponent(id).trim();
  try {
    await connectDB();
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: decodedId }, { orderCode: decodedId }] },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    await prisma.order.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus pesanan' }, { status: 500 });
  }
}
