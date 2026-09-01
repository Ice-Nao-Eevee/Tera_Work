import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TableModel } from '@/lib/models';
import { generateTableToken } from '@/lib/jwt';

// GET /api/tables — list all tables
export async function GET() {
  try {
    await connectDB();
    const tables = await TableModel.find().sort({ tableNumber: 1 }).lean();
    return NextResponse.json({ tables });
  } catch (err) {
    console.error('GET /api/tables error:', err);
    return NextResponse.json({ error: 'Gagal memuat meja' }, { status: 500 });
  }
}

// POST /api/tables — create a new table
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { tableNumber } = await req.json();
    const id = `table-${tableNumber}`;
    const qrToken = generateTableToken(id, tableNumber);
    const table = await TableModel.create({ tableNumber, qrToken, isActive: true });
    return NextResponse.json({ table }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tables error:', err);
    return NextResponse.json({ error: 'Gagal menambah meja' }, { status: 500 });
  }
}
