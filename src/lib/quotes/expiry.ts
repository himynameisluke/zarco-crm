/**
 * Pure quote-expiry check shared by the public viewer page and its actions —
 * one definition of "past validUntil" so the page can't disagree with the
 * accept/decline boundary. (Pure-core/io-shell: no server-only, no DB.)
 */

import { businessDateString } from "@/lib/dates/business";

/** True when the quote's validUntil date (a DATE column, YYYY-MM-DD) has passed in UK time. */
export function isExpired(validUntil: string | null, today: Date = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil < businessDateString(today);
}
