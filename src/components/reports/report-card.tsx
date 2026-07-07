export function ReportCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <h2 className="t-display" style={{ fontSize: 15, margin: 0, color: "var(--ink)" }}>
          {title}
        </h2>
        {hint ? <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{hint}</span> : null}
      </div>
      <div className="card" style={{ padding: 20 }}>
        {children}
      </div>
    </section>
  );
}

/** Small labelled number tile used across report cards. */
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div className="t-eyebrow" style={{ fontSize: 9.5, color: "var(--ink-4)" }}>{label}</div>
      <div className="t-num" style={{ fontSize: 22, color: "var(--ink)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub ? <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{sub}</div> : null}
    </div>
  );
}
