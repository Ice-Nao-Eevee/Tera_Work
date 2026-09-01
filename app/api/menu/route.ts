import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MenuItemModel, CategoryModel } from '@/lib/models';

// GET /api/menu — list all active menu items + all categories
export async function GET() {
  try {
    await connectDB();
    const [items, categories] = await Promise.all([
      MenuItemModel.find({ isActive: true }).lean(),
      CategoryModel.find().sort({ sortOrder: 1 }).lean(),
    ]);
    return NextResponse.json({ menuItems: items, categories });
  } catch (err) {
    console.error('GET /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

// POST /api/menu — create a new menu item
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await MenuItemModel.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/menu error:', err);
    return NextResponse.json({ error: 'Gagal menambah menu' }, { status: 500 });
  }
}
