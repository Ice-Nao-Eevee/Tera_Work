import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return secret;
}

export interface TableTokenPayload {
  tableId: string;
  tableNumber: number;
  iat?: number;
  exp?: number;
}

/**
 * Generates a signed QR token for a table
 */
export function generateTableToken(tableId: string, tableNumber: number): string {
  return jwt.sign({ tableId, tableNumber }, getJwtSecret(), { expiresIn: '12h' });
}

/**
 * Verifies a signed QR token for a table
 */
export function verifyTableToken(token: string): TableTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TableTokenPayload;
  } catch {
    return null;
  }
}
