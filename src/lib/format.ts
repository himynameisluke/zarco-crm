/**
 * Money + date formatting helpers shared across the CRM UI.
 * British conventions throughout (£, DD MMM YYYY, en-GB locale).
 */

export function formatMoney(pence: number | null | undefined, currency = "GBP") {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

export function formatMoneyExact(pence: number | null | undefined, currency = "GBP") {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(pence / 100);
}

export function formatDateShort(d: Date | string | null | undefined) {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Relative time strings ("11m", "3h", "2d", "1w", "3w") for dense rows.
 * Falls back to short date for anything over 8 weeks old.
 */
export function formatRelative(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks <= 8) return `${weeks}w`;
  return formatDateShort(date);
}

export function daysSince(d: Date | string | null | undefined): number | null {
  if (d == null) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(...parts: Array<string | null | undefined>): string {
  const tokens = parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim()[0]?.toUpperCase());
  if (tokens.length === 0) return "·";
  return tokens.slice(0, 2).join("");
}
