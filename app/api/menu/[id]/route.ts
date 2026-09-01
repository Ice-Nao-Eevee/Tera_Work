import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MenuItemModel } from '@/lib/models';

// GET /api/menu/[id] — fetch a single menu item by MongoDB _id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await MenuItemModel.findById(params.id).lean();
    if (!item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error('GET /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

// PUT /api/menu/[id] — update a menu item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await MenuItemModel.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error('PUT /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui menu' }, { status: 500 });
  }
}

// DELETE /api/menu/[id] — delete a menu item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await MenuItemModel.findByIdAndDelete(params.id).lean();
    if (!item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus menu' }, { status: 500 });
  }
}
