import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/menu  list all active menu items + all categories
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const includeInactive = req.nextUrl.searchParams.get('all') === 'true';
    const [menuItems, categories] = await Promise.all([
      prisma.menuItem.findMany({ where: includeInactive ? undefined : { isActive: true }, orderBy: { createdAt: 'asc' } }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return NextResponse.json({ menuItems, categories });
  } catch (err) {
    console.error('GET /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

// POST /api/menu  create a new menu item (admin)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Nama menu wajib diisi' }, { status: 400 });
    }

    const price = Number(body.price);
    if (body.price === undefined || isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Harga menu harus berupa angka dan tidak boleh negatif' }, { status: 400 });
    }

    if (!body.category || typeof body.category !== 'string' || !body.category.trim()) {
      return NextResponse.json({ error: 'Kategori menu wajib diisi' }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        name: body.name.trim(),
        description: body.description ?? '',
        price,
        category: body.category.trim(),
        photoUrl: body.photoUrl ?? '',
        badge: body.badge ?? 'none',
        spiceLevels: Array.isArray(body.spiceLevels) ? body.spiceLevels : [],
        addOns: Array.isArray(body.addOns) ? body.addOns : [],
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal menambah menu' }, { status: 500 });
  }
}
