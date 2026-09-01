import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { PromoModel } from '@/lib/models';

// PUT /api/promos/[id] — update a promo
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const promo = await PromoModel.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!promo) {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ promo });
  } catch (err) {
    console.error('PUT /api/promos/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui promo' }, { status: 500 });
  }
}

// DELETE /api/promos/[id] — delete a promo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const promo = await PromoModel.findByIdAndDelete(params.id).lean();
    if (!promo) {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/promos/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus promo' }, { status: 500 });
  }
}
