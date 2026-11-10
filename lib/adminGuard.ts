/**
 * lib/adminGuard.ts — Unified server-side authentication, session guard, and CSRF Origin check (Task B2 & E5).
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'selera_admin_session';
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 12; // 12 hours
const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 7; // 7 days

let ephemeralDevSecret: string | null = null;

function getSessionSecret(): string | null {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}

/**
 * Hashes a plaintext password using Node crypto.scryptSync.
 */
export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored `scrypt:<saltHex>:<keyHex>` hash
 * (or timing-safe comparison if an unhashed env var `ADMIN_PASSWORD` is provided).
 */
export function verifyAdminPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  try {
    if (stored.startsWith('scrypt:')) {
      const parts = stored.split(':');
      if (parts.length !== 3) return false;
      const salt = Buffer.from(parts[1], 'hex');
      const expectedKey = Buffer.from(parts[2], 'hex');
      const derived = crypto.scryptSync(password, salt, expectedKey.length);
      if (derived.length !== expectedKey.length) return false;
      return crypto.timingSafeEqual(derived, expectedKey);
    }
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(stored, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getExpectedAdminCredentials(): {
  username: string;
  passwordHashOrPlain: string;
} | null {
  const username = (
    process.env.ADMIN_USERNAME ||
    process.env.ADMIN_SEED_EMAIL ||
    'admin'
  ).trim();
  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (configuredHash) {
    return { username, passwordHashOrPlain: configuredHash };
  }

  const configuredAdminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (configuredAdminPassword) {
    return { username, passwordHashOrPlain: configuredAdminPassword };
  }

  const seedPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
  if (seedPassword) {
    if (seedPassword.length < 12) {
      console.error('[AdminGuard] ADMIN_SEED_PASSWORD ditolak karena kurang dari 12 karakter.');
      return null;
    }
    return { username, passwordHashOrPlain: seedPassword };
  }

  return null;
}

export interface AdminSessionPayload {
  role: 'admin';
  username: string;
  iat?: number;
  exp?: number;
}

export function createAdminSessionToken(username: string, remember = false): {
  token: string;
  maxAge: number;
} {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('Konfigurasi sesi admin belum lengkap di server.');
  }
  const maxAge = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  const token = jwt.sign({ role: 'admin', username }, secret, {
    expiresIn: maxAge,
  });
  return { token, maxAge };
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as AdminSessionPayload;
    if (decoded && decoded.role === 'admin' && typeof decoded.username === 'string') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

function isValidAdminKeyHeader(provided: string | null): boolean {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(provided.trim(), 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies CSRF Origin / Referer against Host / NEXT_PUBLIC_APP_URL for state-changing requests (Task E5).
 * Returns null if valid, or a 403 NextResponse if Origin mismatches.
 */
export function verifyCsrfOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const originHeader = req.headers.get('origin') || req.headers.get('referer');
  if (!originHeader) {
    // Non-browser CLI or same-origin request without Origin header
    return null;
  }

  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    const requestHost = (
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      ''
    )
      .split(',')[0]
      .trim()
      .toLowerCase();

    const allowedHosts = new Set<string>();
    if (requestHost) allowedHosts.add(requestHost);

    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredAppUrl) {
      try {
        allowedHosts.add(new URL(configuredAppUrl).host.toLowerCase());
      } catch {
        // ignore invalid env URL
      }
    }

    if (allowedHosts.size > 0 && !allowedHosts.has(originHost)) {
      return NextResponse.json(
        { error: 'Permintaan lintas domain (CSRF) ditolak.' },
        { status: 403 }
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: 'Header Origin tidak valid.' },
      { status: 403 }
    );
  }
}

/**
 * Verifies that the request carries a valid admin session cookie (`selera_admin_session`)
 * or a valid `x-admin-key` header matching `ADMIN_API_KEY`, and enforces CSRF Origin check
 * on state-changing requests using cookies.
 * Returns `null` when authorized, or a 401/403 `NextResponse` when unauthorized.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  // 1. Check signed httpOnly session cookie
  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (verifyAdminSessionToken(sessionCookie)) {
    const csrfDenied = verifyCsrfOrigin(req);
    if (csrfDenied) return csrfDenied;
    return null;
  }

  // 2. Check optional x-admin-key header (for CLI/API administration if ADMIN_API_KEY is set)
  if (isValidAdminKeyHeader(req.headers.get('x-admin-key'))) {
    return null;
  }

  return NextResponse.json(
    { error: 'Akses ditolak. Silakan login sebagai admin.' },
    { status: 401 }
  );
}
