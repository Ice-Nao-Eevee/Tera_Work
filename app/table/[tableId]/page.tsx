import { redirect } from 'next/navigation';

/**
 * Legacy entry point (/table/[N]). Each table now has its own unique QR
 * (/t/[token]); the table can no longer be chosen via URL, so this route only
 * forwards to the menu without saving any table number.
 */
export default function LegacyTableRedirect() {
  redirect('/menu');
}
