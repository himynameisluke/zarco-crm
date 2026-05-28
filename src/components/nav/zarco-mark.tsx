type ZarcoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The Zarco brand mark — heavy "Z" on a tile with a single magenta
 * triangular corner notch (top-right). Variant **C** from the May 2026
 * design handoff's mark exploration.
 *
 * The tile and the glyph use CSS vars (`--ink` and `--paper`) instead of
 * hard-coded hex so the mark **auto-flips** with theme:
 *   - Light mode (paper bg):  ink tile (dark) + paper Z (light) + magenta
 *   - Dark mode (ink bg):     paper tile (light) + ink Z (dark) + magenta
 * Either way the result is a high-contrast tile against the surface with
 * the magenta corner notch as the only color.
 *
 * Geometry mirrors `preview/brand-mark.html` from the design bundle:
 *   - corner radius ≈ size × 0.15
 *   - notch leg     ≈ size × 0.30  (so the 96px tile gets a 28px notch)
 *   - glyph size    ≈ size × 0.625
 *
 * Server-renderable.
 */
export function ZarcoMark({ size = 28, className }: ZarcoMarkProps) {
  const radius = Math.max(4, Math.round(size * 0.15));
  const notch = Math.max(6, Math.round(size * 0.3));
  const fontSize = Math.round(size * 0.625);

  // 72% of tile height optically centres a heavy Hanken Grotesk cap. Pure
  // 50% sits too high because the cap is solid all the way through.
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
      {/* Tile uses --ink so it inverts with theme. In light mode --ink is
          dark and the tile reads as the canonical near-black square. In
          dark mode --ink is paper-white and the tile becomes a bright tile
          on the dark surface — same visual idea, inverted. */}
      <rect
        width={size}
        height={size}
        rx={radius}
        style={{ fill: "var(--ink)" }}
      />
      {/* Magenta corner notch is mode-agnostic. */}
      <polygon
        points={`${size},0 ${size},${notch} ${size - notch},0`}
        fill="#FF0066"
      />
      {/* Glyph uses --paper so it inverts with theme alongside the tile. */}
      <text
        x={size / 2}
        y={yBaseline}
        textAnchor="middle"
        fontFamily='"Hanken Grotesk", system-ui, sans-serif'
        fontWeight={800}
        fontSize={fontSize}
        letterSpacing="-0.04em"
        style={{ fill: "var(--paper)" }}
      >
        Z
      </text>
    </svg>
  );
}
