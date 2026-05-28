type ZarcoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The Zarco brand mark — heavy "Z" on a near-black ink tile with a single
 * magenta triangular corner notch (top-right). This is the **C — corner
 * notch** variant from the design handoff: modern, structural, low-noise.
 * The magenta earns attention by being the only color.
 *
 * Geometry mirrors `preview/brand-mark.html` from the design bundle:
 *   - corner radius ≈ size × 0.15
 *   - notch leg     ≈ size × 0.30  (so the 96px tile gets a 28px notch)
 *   - glyph font-size ≈ size × 0.625
 *
 * Server-renderable (no client hooks).
 */
export function ZarcoMark({ size = 28, className }: ZarcoMarkProps) {
  const radius = Math.max(4, Math.round(size * 0.15));
  const notch = Math.max(6, Math.round(size * 0.3));
  const fontSize = Math.round(size * 0.625);

  // y-baseline = ~72% of tile height places the Z optically centred for
  // Hanken Grotesk 800. (Pure 50% reads too high because the cap is solid.)
  const yBaseline = Math.round(size * 0.72);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Zarco"
      className={className}
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* Ink tile */}
      <rect width={size} height={size} rx={radius} fill="#0E0E0E" />
      {/* Magenta corner notch (top-right, triangular) */}
      <polygon
        points={`${size},0 ${size},${notch} ${size - notch},0`}
        fill="#FF0066"
      />
      {/* Heavy Z monogram in paper white */}
      <text
        x={size / 2}
        y={yBaseline}
        textAnchor="middle"
        fontFamily='"Hanken Grotesk", system-ui, sans-serif'
        fontWeight={800}
        fontSize={fontSize}
        letterSpacing="-0.04em"
        fill="#FAFAF7"
      >
        Z
      </text>
    </svg>
  );
}
