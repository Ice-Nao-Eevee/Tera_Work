import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// DELETE /api/tables/[id] — delete a table by Prisma id (cuid)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await prisma.restaurantTable.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Meja tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/tables/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus meja' }, { status: 500 });
  }
}
