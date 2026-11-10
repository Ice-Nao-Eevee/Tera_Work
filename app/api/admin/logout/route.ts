import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyCsrfOrigin } from '@/lib/adminGuard';

export async function POST(req: NextRequest) {
  const csrfDenied = verifyCsrfOrigin(req);
  if (csrfDenied) return csrfDenied;

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
