/**
 * Deterministic colour assignment for tinted avatars and dots.
 * Used to give each organisation a consistent visual identity across views.
 *
 * Zarco design system v2 is officially "paper + ink + one magenta" — no
 * decorative colors. For per-org avatar tints (a stand-in for a real logo)
 * we still want some visual variety so 30 rows don't read as a wall of ink.
 * The compromise: a tight palette of muted ink-friendly tones that read
 * quietly on paper. None compete with magenta; none introduce a "second
 * accent" the eye could mistake for brand color.
 */
const ORG_PALETTE = [
  "#2A2A29", // ink
  "#5C5C5A", // ink-60
  "#1F7A4D", // success green (quiet)
  "#1E5FBE", // info blue (quiet)
  "#B26B00", // warning amber (quiet)
  "#C7263C", // danger red (quiet)
  "#7C3AED", // muted violet (one fallback for variety)
] as const;

export function colorFromString(value: string | null | undefined): string {
  if (!value) return ORG_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return ORG_PALETTE[Math.abs(hash) % ORG_PALETTE.length];
}

export function tintColor(hex: string, alpha: number): string {
  // Returns the colour with the given alpha appended as 2 hex digits.
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
