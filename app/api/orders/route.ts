import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { OrderModel } from '@/lib/models';

function generateOrderCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ARU-${num}`;
}

// GET /api/orders — list all orders, newest first
export async function GET() {
  try {
    await connectDB();
    const orders = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

// POST /api/orders — create a new order (from customer checkout)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Ensure unique order code (retry up to 3 times on collision)
    let orderCode = generateOrderCode();
    let attempts = 0;
    while (attempts < 3) {
      const existing = await OrderModel.findOne({ orderCode });
      if (!existing) break;
      orderCode = generateOrderCode();
      attempts++;
    }

    const order = await OrderModel.create({
      orderCode,
      tableNumber: body.tableNumber || 1,
      items: body.items || [],
      notes: body.notes || '',
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      serviceChargeAmount: body.serviceChargeAmount || 0,
      total: body.total || 0,
      status: 'received',
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 });
  }
}
