import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { CategoryModel } from '@/lib/models';

// GET /api/categories — list all categories sorted by sortOrder
export async function GET() {
  try {
    await connectDB();
    const categories = await CategoryModel.find().sort({ sortOrder: 1 }).lean();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 });
  }
}

// POST /api/categories — create a new category
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    // Generate slug from name if not provided
    if (!body.slug) {
      body.slug = body.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    // Assign next sortOrder
    if (body.sortOrder === undefined) {
      const count = await CategoryModel.countDocuments();
      body.sortOrder = count;
    }
    const category = await CategoryModel.create(body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal menambah kategori' }, { status: 500 });
  }
}
