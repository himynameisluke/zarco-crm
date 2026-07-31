/** Quiet inline progress meter — track + fill + numeric readout, used in
 * the table rows and (in miniature) on board cards. `null` means nothing
 * countable yet (no tasks, no manual override) and reads as a dash rather
 * than a misleading 0%. */
export function ProgressBar({
  value,
  width = 72,
}: {
  value: number | null;
  width?: number;
}) {
  if (value == null) {
    return <span style={{ color: "var(--ink-4)", fontSize: 12 }}>—</span>;
  }
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width,
          height: 5,
          borderRadius: 999,
          background: "var(--paper-3)",
          border: "1px solid var(--ink-20)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct >= 100 ? "var(--success)" : "var(--ink-60)",
            borderRadius: 999,
          }}
        />
      </div>
      <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 30 }}>
        {pct}%
      </span>
    </div>
  );
}
