import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/categories  list all categories sorted by sortOrder
export async function GET() {
  try {
    await connectDB();
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 });
  }
}

// POST /api/categories  create a new category
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const name = body.name.trim();
    let slug = body.slug;
    if (!slug) {
      slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : await prisma.category.count();

    const category = await prisma.category.create({
      data: { name, slug, sortOrder },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal menambah kategori' }, { status: 500 });
  }
}
