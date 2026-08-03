/**
 * Pure quote-expiry check shared by the public viewer page and its actions —
 * one definition of "past validUntil" so the page can't disagree with the
 * accept/decline boundary. (Pure-core/io-shell: no server-only, no DB.)
 */

/** True when the quote's validUntil date (a DATE column, YYYY-MM-DD) has passed. */
export function isExpired(validUntil: string | null, today: Date = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil < today.toISOString().slice(0, 10);
}
