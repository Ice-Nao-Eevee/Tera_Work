import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// PUT /api/promos/[id] — update a promo
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const promo = await prisma.promo.update({
      where: { id: params.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.originalPrice !== undefined && { originalPrice: Number(body.originalPrice) }),
        ...(body.discountedPrice !== undefined && { discountedPrice: Number(body.discountedPrice) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return NextResponse.json({ promo });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
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
    await prisma.promo.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Promo tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/promos/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus promo' }, { status: 500 });
  }
}
