import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import prisma from '@/lib/prisma';

// GET /api/tables — public list. NEVER exposes qrToken (the token is a secret).
// Creating / deleting / regenerating tables lives in /api/admin/tables (guarded).
export async function GET() {
  try {
    await connectDB();
    const tables = await prisma.restaurantTable.findMany({
      orderBy: { tableNumber: 'asc' },
      select: { id: true, tableNumber: true, isActive: true },
    });
    return NextResponse.json({ tables });
  } catch (err) {
    console.error('GET /api/tables error:', err);
    return NextResponse.json({ error: 'Gagal memuat meja' }, { status: 500 });
  }
}
