import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { OrderModel } from '@/lib/models';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const orderCode = decodeURIComponent(params.id);

  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const order = await OrderModel.findOne({ orderCode }).lean();
      if (order) {
        return NextResponse.json({ order });
      }
    }
  } catch (err) {
    console.log('Using memory store fallback for /api/orders/[id]');
  }

  const store = getMemoryStore();
  const order = store.orders.find((o) => o.orderCode === orderCode);

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const orderCode = decodeURIComponent(params.id);
  const body = await req.json();

  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const updated = await OrderModel.findOneAndUpdate(
        { orderCode },
        { status: body.status, updatedAt: new Date() },
        { new: true }
      ).lean();
      if (updated) {
        return NextResponse.json({ order: updated });
      }
    }
  } catch (err) {
    console.log('Using memory store fallback for PATCH /api/orders/[id]');
  }

  const store = getMemoryStore();
  const index = store.orders.findIndex((o) => o.orderCode === orderCode);
  if (index > -1) {
    store.orders[index].status = body.status;
    store.orders[index].updatedAt = new Date().toISOString();
    return NextResponse.json({ order: store.orders[index] });
  }

  return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
}
