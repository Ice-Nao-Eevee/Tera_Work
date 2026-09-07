import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error('GET /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat menu' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
        ...(body.badge !== undefined && { badge: body.badge }),
        ...(body.spiceLevels !== undefined && { spiceLevels: body.spiceLevels }),
        ...(body.addOns !== undefined && { addOns: body.addOns }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return NextResponse.json({ item });
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    console.error('PUT /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui menu' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await prisma.menuItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 });
    console.error('DELETE /api/menu/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus menu' }, { status: 500 });
  }
}
