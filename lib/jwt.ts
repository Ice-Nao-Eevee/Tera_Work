import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'selera-sambal-qr-secret-key-2026';

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
  return jwt.sign({ tableId, tableNumber }, JWT_SECRET, { expiresIn: '12h' });
}

/**
 * Verifies a signed QR token for a table
 */
export function verifyTableToken(token: string): TableTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TableTokenPayload;
  } catch (err) {
    return null;
  }
}
