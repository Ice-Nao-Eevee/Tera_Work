import { NextResponse } from 'next/server';
import { getTableFromCookie } from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

// GET /api/table-context — tells the client which table (if any) the httpOnly cookie maps to.
export async function GET() {
  try {
    const table = await getTableFromCookie();
    return NextResponse.json(
      { table: table ? { tableNumber: table.tableNumber } : null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('GET /api/table-context error:', err);
    return NextResponse.json({ table: null });
  }
}
