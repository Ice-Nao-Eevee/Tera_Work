import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { generateUniqueTableToken } from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/tables/[id] — { isActive: boolean } and/or { regenerateToken: true }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const data: { isActive?: boolean; qrToken?: string } = {};
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (body.regenerateToken === true) data.qrToken = await generateUniqueTableToken();
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 });
    }
    const table = await prisma.restaurantTable.update({ where: { id }, data });
    return NextResponse.json({ table });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Meja tidak ditemukan' }, { status: 404 });
    }
    console.error('PATCH /api/admin/tables/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui meja' }, { status: 500 });
  }
}

// DELETE /api/admin/tables/[id] — only when the table has no orders
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const { id } = await params;
    const orderCount = await prisma.order.count({ where: { tableId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Meja sudah memiliki pesanan dan tidak bisa dihapus. Nonaktifkan saja.' },
        { status: 409 }
      );
    }
    await prisma.restaurantTable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Meja tidak ditemukan' }, { status: 404 });
    }
    console.error('DELETE /api/admin/tables/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus meja' }, { status: 500 });
  }
}
