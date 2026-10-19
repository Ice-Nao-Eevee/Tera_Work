/**
 * lib/tableToken.ts — Unique-QR-per-table helpers (server-side).
 *
 * The QR of each table encodes `${NEXT_PUBLIC_APP_URL}/t/${token}`. Scanning it
 * stores the token in an httpOnly cookie; the order API resolves the table from
 * that cookie itself and never trusts a table id/number sent by the browser.
 */

import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import prisma from './prisma';

export const TABLE_COOKIE_NAME = 'selera_table_token';
/** Lifetime of the table cookie. Adjust this single constant (default: 4 hours). */
export const TABLE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 4;
export const TABLE_TOKEN_LENGTH = 10;

export function generateTableTokenString(): string {
  return nanoid(TABLE_TOKEN_LENGTH);
}

/** Generates a token not yet used by any table (retries on collision). */
export async function generateUniqueTableToken(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const token = generateTableTokenString();
    const existing = await prisma.restaurantTable.findUnique({ where: { qrToken: token } });
    if (!existing) return token;
  }
  throw new Error('Gagal membuat token meja unik');
}

/** Looks up an ACTIVE table by its QR token. Returns null when invalid/inactive. */
export async function findActiveTableByToken(token: string | undefined | null) {
  if (!token || token.length > 64) return null;
  const table = await prisma.restaurantTable.findUnique({ where: { qrToken: token } });
  return table && table.isActive ? table : null;
}

/** Resolves the table from the request cookie (server-validated on every call). */
export async function getTableFromCookie() {
  const store = await cookies();
  return findActiveTableByToken(store.get(TABLE_COOKIE_NAME)?.value);
}

/** Public base URL used inside printed QR codes. */
export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
}
