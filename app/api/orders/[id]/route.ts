import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/orders/[id] — fetch a single order by orderCode
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderCode = decodeURIComponent(id);
  try {
    await connectDB();
    const order = await prisma.order.findFirst({ where: { orderCode } });
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    console.error('GET /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — update order status and/or items (used by admin panel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderCode = decodeURIComponent(id);
  try {
    await connectDB();
    const body = await req.json();
    const { status, items, paymentStatus, paymentMethod } = body;

    // Build the update payload
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
    }
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }

    // If items are provided, recalculate totals and update items
    if (Array.isArray(items) && items.length > 0) {
      const settings = await prisma.settings.findFirst();
      const taxRate = settings?.taxRatePercent ?? 10;
      const serviceRate = settings?.serviceChargeRatePercent ?? 5;

      const subtotal = items.reduce((sum: number, item: { price: number; qty: number }) => {
        return sum + (Number(item.price) || 0) * (Number(item.qty) || 0);
      }, 0);
      const taxAmount = Math.round(subtotal * taxRate / 100);
      const serviceChargeAmount = Math.round(subtotal * serviceRate / 100);
      const total = subtotal + taxAmount + serviceChargeAmount;

      updateData.items = items;
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.serviceChargeAmount = serviceChargeAmount;
      updateData.total = total;
    }

    const order = await prisma.order.update({
      where: { orderCode },
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

// DELETE /api/orders/[id] — delete an order (admin only)
// params.id here is the orderCode (URL-encoded)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderCode = decodeURIComponent(id);
  try {
    await connectDB();
    await prisma.order.delete({ where: { orderCode } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus pesanan' }, { status: 500 });
  }
}
