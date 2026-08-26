import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { OrderModel, IOrder } from '@/lib/models';

function generateOrderCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ARU-${num}`;
}

export async function GET() {
  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const orders = await OrderModel.find().sort({ createdAt: -1 }).lean();
      return NextResponse.json({ orders });
    }
  } catch (err) {
    console.log('Using memory store fallback for GET /api/orders');
  }

  const store = getMemoryStore();
  return NextResponse.json({ orders: store.orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderCode = generateOrderCode();

    const newOrder: IOrder = {
      orderCode,
      tableNumber: body.tableNumber || 5,
      items: body.items || [],
      notes: body.notes || '',
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      serviceChargeAmount: body.serviceChargeAmount || 0,
      total: body.total || 0,
      status: 'received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await connectDB();

    if (process.env.MONGODB_URI) {
      try {
        const created = await OrderModel.create(newOrder);
        return NextResponse.json({ order: created }, { status: 201 });
      } catch (err) {
        console.error('Error saving order to MongoDB:', err);
      }
    }

    // Save to memory store
    const store = getMemoryStore();
    store.orders.unshift(newOrder);
    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 });
  }
}
