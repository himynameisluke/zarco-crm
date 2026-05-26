type ZarcoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The brand mark — a hollow ring with a green→teal linear gradient.
 * Adapted from the design package's `ZarcoMark` SVG. Server-renderable.
 */
export function ZarcoMark({ size = 18, className }: ZarcoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="zarco-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5EE07B" />
          <stop offset="1" stopColor="#7FCFE5" />
        </linearGradient>
      </defs>
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="url(#zarco-mark-grad)"
        strokeWidth="3"
      />
    </svg>
  );
}
