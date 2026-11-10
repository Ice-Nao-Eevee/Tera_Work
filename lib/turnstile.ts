/**
 * lib/turnstile.ts — Server-side Cloudflare Turnstile verification (Task C5).
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

let warnedTurnstileMissing = false;

export interface TurnstileCheckResult {
  ok: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileCheckResult> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  // If neither key is set: skip in development with warning, reject in production
  if (!siteKey && !secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY & TURNSTILE_SECRET_KEY wajib diisi di production.');
      return {
        ok: false,
        error: 'Verifikasi keamanan belum dikonfigurasi. Silakan hubungi kasir.',
      };
    }
    if (!warnedTurnstileMissing) {
      warnedTurnstileMissing = true;
      console.warn(
        '[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY dan TURNSTILE_SECRET_KEY belum diset; melewati verifikasi Turnstile di mode development.'
      );
    }
    return { ok: true };
  }

  // If in production (or if secretKey is configured), token is mandatory
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY belum diset di production.');
      return { ok: false, error: 'Verifikasi keamanan gagal. Silakan coba lagi.' };
    }
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY belum diset; melewati verifikasi di development.');
    return { ok: true };
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      error: 'Verifikasi anti-bot wajib diselesaikan sebelum mengirim pesanan.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) {
      console.error('[Turnstile] HTTP error from siteverify:', res.status);
      return { ok: false, error: 'Verifikasi keamanan gagal. Silakan coba lagi.' };
    }

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      console.warn('[Turnstile] Token rejected:', data['error-codes']);
      return { ok: false, error: 'Verifikasi anti-bot tidak valid atau kedaluwarsa. Silakan ulangi.' };
    }

    return { ok: true };
  } catch (err) {
    console.error('[Turnstile] Verification exception:', err);
    return { ok: false, error: 'Gagal memverifikasi keamanan. Silakan coba lagi.' };
  }
}
