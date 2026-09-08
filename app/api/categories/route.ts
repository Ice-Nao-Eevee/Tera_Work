import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/categories — list all categories sorted by sortOrder
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

// POST /api/categories — create a new category
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    if (!body.slug) {
      body.slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (body.sortOrder === undefined) {
      body.sortOrder = await prisma.category.count();
    }
    const category = await prisma.category.create({
      data: { name: body.name, slug: body.slug, sortOrder: body.sortOrder },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Gagal menambah kategori' }, { status: 500 });
  }
}
