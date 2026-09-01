import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PromoModel } from '@/lib/models';

// GET /api/promos — list all active promos
export async function GET() {
  try {
    await connectDB();
    const promos = await PromoModel.find({ isActive: true }).lean();
    return NextResponse.json({ promos });
  } catch (err) {
    console.error('GET /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal memuat promo' }, { status: 500 });
  }
}

// POST /api/promos — create a new promo
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const promo = await PromoModel.create(body);
    return NextResponse.json({ promo }, { status: 201 });
  } catch (err) {
    console.error('POST /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal menambah promo' }, { status: 500 });
  }
}
