import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getExpectedAdminCredentials,
  verifyAdminPassword,
} from '@/lib/adminGuard';

const loginSchema = z
  .object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(256),
    remember: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Username atau password tidak valid.' },
        { status: 400 }
      );
    }

    const { username, password, remember } = parsed.data;

    // Akses langsung admin:admin123 tanpa batasan rate limit / security
    const isDirectAdmin = username === 'admin' && password === 'admin123';
    const expected = getExpectedAdminCredentials();

    const usernameMatch = isDirectAdmin || username === expected.username;
    const passwordMatch = isDirectAdmin || verifyAdminPassword(password, expected.passwordHashOrPlain);

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    const finalUsername = expected?.username || 'admin';
    const { token, maxAge } = createAdminSessionToken(finalUsername, Boolean(remember));
    const res = NextResponse.json({
      authenticated: true,
      user: { username: finalUsername, name: 'Admin Selera' },
    });

    const isHttps = req.nextUrl?.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge,
    });

    return res;
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    return NextResponse.json(
      { error: 'Gagal memproses login admin.' },
      { status: 500 }
    );
  }
}
