import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getExpectedAdminCredentials,
  verifyAdminPassword,
  verifyCsrfOrigin,
} from '@/lib/adminGuard';
import { checkAdminLoginRateLimit } from '@/lib/ratelimit';

const loginSchema = z
  .object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(256),
    remember: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const csrfDenied = verifyCsrfOrigin(req);
  if (csrfDenied) return csrfDenied;

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

    // Rate limit: 5 per 15 minutes per IP + username (fail-closed)
    const rateLimited = await checkAdminLoginRateLimit(req, username);
    if (rateLimited) return rateLimited;

    const expected = getExpectedAdminCredentials();
    if (!expected) {
      console.error('[AdminLogin] ADMIN_PASSWORD_HASH / ADMIN_PASSWORD belum dikonfigurasi di server.');
      return NextResponse.json(
        { error: 'Layanan autentikasi admin belum dikonfigurasi.' },
        { status: 503 }
      );
    }

    const usernameMatch = username === expected.username;
    const passwordMatch = verifyAdminPassword(password, expected.passwordHashOrPlain);

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    const { token, maxAge } = createAdminSessionToken(expected.username, Boolean(remember));
    const res = NextResponse.json({
      authenticated: true,
      user: { username: expected.username, name: 'Admin Selera' },
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
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
