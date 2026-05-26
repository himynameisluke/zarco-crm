/**
 * Deterministic colour assignment for tinted avatars and dots.
 * Used to give each organisation a consistent visual identity across views.
 */
const ORG_PALETTE = [
  "#5EE07B", // green
  "#7FCFE5", // teal
  "#A78BFA", // violet
  "#F472B6", // pink
  "#FBBF24", // amber
  "#F97316", // orange
  "#60A5FA", // blue
] as const;

export function colorFromString(value: string | null | undefined): string {
  if (!value) return "#7FCFE5";
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
