import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/menu — list all active menu items + all categories
export async function GET() {
  try {
    await connectDB();
    const [menuItems, categories] = await Promise.all([
      prisma.menuItem.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return NextResponse.json({ menuItems, categories });
  } catch (err) {
    console.error('GET /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

// POST /api/menu — create a new menu item (admin)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description,
        price: Number(body.price),
        category: body.category,
        photoUrl: body.photoUrl ?? '',
        badge: body.badge ?? 'none',
        spiceLevels: body.spiceLevels ?? [],
        addOns: body.addOns ?? [],
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal menambah menu' }, { status: 500 });
  }
}
