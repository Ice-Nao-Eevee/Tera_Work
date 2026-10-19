/**
 * lib/adminGuard.ts — lightweight server-side guard for table management APIs.
 *
 * The admin UI login is client-side only, so sensitive endpoints (they expose
 * QR tokens) additionally require header `x-admin-key` == env ADMIN_API_KEY.
 * If ADMIN_API_KEY is unset: allowed in development, rejected in production.
 */

import { NextRequest, NextResponse } from 'next/server';

export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'ADMIN_API_KEY belum dikonfigurasi di server.' },
        { status: 503 }
      );
    }
    return null;
  }
  if (req.headers.get('x-admin-key') !== expected) {
    return NextResponse.json({ error: 'Kunci admin tidak valid.' }, { status: 401 });
  }
  return null;
}
