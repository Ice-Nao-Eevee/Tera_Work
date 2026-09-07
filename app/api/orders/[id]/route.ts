import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/orders/[id] — fetch a single order by orderCode
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderCode = decodeURIComponent(params.id);
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

// PATCH /api/orders/[id] — update order status (used by admin panel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderCode = decodeURIComponent(params.id);
  try {
    await connectDB();
    const { status } = await req.json();
    const order = await prisma.order.update({
      where: { orderCode },
      data: { status },
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
  { params }: { params: { id: string } }
) {
  const orderCode = decodeURIComponent(params.id);
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
