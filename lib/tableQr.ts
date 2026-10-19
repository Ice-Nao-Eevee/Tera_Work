'use client';

/**
 * lib/tableQr.ts — client-side helpers for table QR codes + admin key.
 * QR images are generated on the fly in the browser (never written to disk).
 */

import QRCode from 'qrcode';

export const BRAND_NAME = 'Selera Sambal';
const ADMIN_KEY_STORAGE = 'ss_admin_key';

export function getAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
}
export function setAdminKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
  else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}
export function adminHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() };
}

/** `${BASE_URL}/t/${token}` — base comes from NEXT_PUBLIC_APP_URL (served by the API). */
export function tableScanUrl(baseUrl: string, token: string): string {
  const base = (baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
  return `${base}/t/${token}`;
}

export function qrDataUrl(text: string, width = 300): Promise<string> {
  return QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M' });
}

/** Builds a labelled PNG ("Selera Sambal" / QR / "Meja N") and triggers a download. */
export async function downloadTableQrPng(url: string, tableNumber: number): Promise<void> {
  const qr = await qrDataUrl(url, 640);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Gagal membuat gambar QR'));
    img.src = qr;
  });
  const W = 760, H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b45309';
  ctx.font = 'italic bold 48px Georgia, serif';
  ctx.fillText(BRAND_NAME, W / 2, 80);
  ctx.drawImage(img, (W - 640) / 2, 120, 640, 640);
  ctx.fillStyle = '#2a1a15';
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillText(`Meja ${tableNumber}`, W / 2, 840);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `qr-meja-${tableNumber}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
