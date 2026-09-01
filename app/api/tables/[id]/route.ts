import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TableModel } from '@/lib/models';

// DELETE /api/tables/[id] — delete a table by MongoDB _id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const table = await TableModel.findByIdAndDelete(params.id).lean();
    if (!table) {
      return NextResponse.json({ error: 'Meja tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tables/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus meja' }, { status: 500 });
  }
}
