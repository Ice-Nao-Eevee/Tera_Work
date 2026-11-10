/**
 * lib/safeUrl.ts — URL validation helper (Task E2).
 * Only allows http: and https: protocols, rejecting javascript:, data:, vbscript:, file:, etc.
 */

export function safeUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Validates an image URL or internal relative path (e.g. "/uploads/..." or "/warkop-betawa-logo.png"),
 * while rejecting any dangerous scheme (`javascript:`, `data:`, `vbscript:`, protocol-relative `//`, etc.).
 */
export function safeImageUrlOrEmpty(input: unknown): string | null {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed === '') return '';
  // Allow clean root-relative path (single leading slash, no control chars)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !/[\u0000-\u001F\s]/.test(trimmed)) {
    return trimmed;
  }
  return safeUrl(trimmed);
}

