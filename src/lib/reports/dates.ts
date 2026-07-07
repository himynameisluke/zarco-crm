import type { ReportPeriod } from "./types";

// All month math is calendar-based in UTC. Deal/contract dates are stored as
// DATE (no time), so UTC avoids any timezone drift in bucketing.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08-31" -> "2026-08" (a DATE column string). */
export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function nextMonthKeys(now: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))));
  }
  return keys;
}

export function monthsAgo(now: Date, n: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, now.getUTCDate()));
}

export function periodMonths(period: ReportPeriod): number {
  return period === "3m" ? 3 : period === "12m" ? 12 : 6;
}
