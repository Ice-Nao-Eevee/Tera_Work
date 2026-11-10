import { NextRequest, NextResponse } from 'next/server';
import {
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  DEVICE_COOKIE_NAME,
  generateDeviceIdString,
  getTableFromCookie,
} from '@/lib/tableToken';

export const dynamic = 'force-dynamic';

// GET /api/table-context — tells the client which table (if any) the httpOnly cookie maps to.
export async function GET(req: NextRequest) {
  try {
    const table = await getTableFromCookie();
    const res = NextResponse.json(
      { table: table ? { tableNumber: table.tableNumber } : null },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    const existingDevice = req.cookies.get(DEVICE_COOKIE_NAME)?.value;
    if (!existingDevice || existingDevice.length < 8) {
      res.cookies.set(DEVICE_COOKIE_NAME, generateDeviceIdString(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
      });
    }

    return res;
  } catch (err) {
    console.error('GET /api/table-context error:', err);
    return NextResponse.json({ table: null });
  }
}
