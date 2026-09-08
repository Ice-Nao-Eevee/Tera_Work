import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/promos
export async function GET() {
  try {
    await connectDB();
    const promos = await prisma.promo.findMany({ where: { isActive: true } });
    return NextResponse.json({ promos });
  } catch (err) {
    console.error('GET /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal memuat promo' }, { status: 500 });
  }
}

// POST /api/promos
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const promo = await prisma.promo.create({
      data: {
        title: body.title,
        description: body.description,
        originalPrice: Number(body.originalPrice),
        discountedPrice: Number(body.discountedPrice),
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ promo }, { status: 201 });
  } catch (err) {
    console.error('POST /api/promos error:', err);
    return NextResponse.json({ error: 'Gagal menambah promo' }, { status: 500 });
  }
}
