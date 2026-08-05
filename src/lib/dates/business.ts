/**
 * Business-local calendar dates (pure — no server-only, no DB).
 *
 * Zarco operates on UK time, but every date stamp in the app was derived
 * via toISOString(), i.e. the UTC calendar day. Between 23:00 and 00:00
 * UTC in summer (BST) that is *yesterday* from the business's point of
 * view — a deal won at 00:30 on the 3rd got closeDate = the 2nd.
 *
 * Single-workspace-timezone is a deliberate simplification for an
 * internal-only UK tool; a per-workspace timezone column can replace
 * BUSINESS_TIME_ZONE if that ever changes.
 */

export const BUSINESS_TIME_ZONE = "Europe/London";

/** YYYY-MM-DD for the given instant in the business timezone. */
export function businessDateString(
  instant: Date = new Date(),
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
