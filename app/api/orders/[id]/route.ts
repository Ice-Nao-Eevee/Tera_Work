import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { OrderModel } from '@/lib/models';

// GET /api/orders/[id] — fetch a single order by orderCode
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderCode = decodeURIComponent(params.id);
  try {
    await connectDB();
    const order = await OrderModel.findOne({ orderCode }).lean();
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
    const order = await OrderModel.findOneAndUpdate(
      { orderCode },
      { status, updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    console.error('PATCH /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status pesanan' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] — delete an order (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderCode = decodeURIComponent(params.id);
  try {
    await connectDB();
    const order = await OrderModel.findOneAndDelete({ orderCode }).lean();
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus pesanan' }, { status: 500 });
  }
}
