import { NextResponse } from 'next/server';
import { connectDB, getMemoryStore } from '@/lib/db';
import { MenuItemModel, CategoryModel } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    if (process.env.MONGODB_URI) {
      const items = await MenuItemModel.find({ isActive: true }).lean();
      const categories = await CategoryModel.find().sort({ sortOrder: 1 }).lean();
      if (items.length > 0) {
        return NextResponse.json({ menuItems: items, categories });
      }
    }
  } catch (err) {
    console.log('Using memory store fallback for /api/menu');
  }

  const store = getMemoryStore();
  return NextResponse.json({
    menuItems: store.menuItems,
    categories: store.categories,
  });
}
