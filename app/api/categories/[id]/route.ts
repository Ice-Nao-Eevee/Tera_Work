import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { CategoryModel } from '@/lib/models';

// PUT /api/categories/[id] — update a category
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const category = await CategoryModel.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!category) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (err) {
    console.error('PUT /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete a category
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const category = await CategoryModel.findByIdAndDelete(params.id).lean();
    if (!category) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 });
  }
}
