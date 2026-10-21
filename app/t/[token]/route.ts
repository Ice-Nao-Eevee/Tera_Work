import { NextRequest, NextResponse } from 'next/server';
import {
  TABLE_COOKIE_MAX_AGE_SECONDS,
  TABLE_COOKIE_NAME,
  findActiveTableByToken,
} from '@/lib/tableToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Prisma needs the Node.js runtime (not Edge)

const errorHtml = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Layanan Sementara Tidak Tersedia · Selera Sambal</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 24px">
<h1>Layanan sementara tidak tersedia</h1>
<p>Coba scan ulang QR dalam beberapa saat, atau hubungi staf.</p>
</body></html>`;

const invalidHtml = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>QR Meja Tidak Valid · Selera Sambal</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#2a1a15;font-family:system-ui,sans-serif;padding:24px}
  .card{background:#fcf8f2;border:1px solid #d4bc8c;border-radius:24px;padding:40px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.4)}
  .brand{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#8c5950;font-weight:700}
  h1{font-size:24px;color:#b45309;margin:12px 0}
  p{color:#5a423a;font-size:14px;line-height:1.6;margin:0}
</style></head>
<body><main class="card">
  <div class="brand">Selera Sambal</div>
  <h1>QR meja tidak valid</h1>
  <p>QR meja tidak valid. Silakan hubungi staf.</p>
</main></body></html>`;

// GET /t/[token] — scan entry point for a table's unique QR code.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let table = null;
  try {
    table = await findActiveTableByToken(token);
  } catch (err) {
    // Database/config failure — NOT an invalid QR. Surface it as 503.
    console.error('GET /t/[token] error:', err);
    return new Response(errorHtml, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  if (!table) {
    return new Response(invalidHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const dest = req.nextUrl.clone();
  dest.pathname = '/menu';
  dest.search = '';
  const res = NextResponse.redirect(dest);
  res.cookies.set(TABLE_COOKIE_NAME, table.qrToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TABLE_COOKIE_MAX_AGE_SECONDS,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
