import type { FunnelResult } from "@/lib/reports/types";

export function FunnelChart({ data }: { data: FunnelResult }) {
  const max = Math.max(1, ...data.stages.map((s) => s.count));
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.stages.map((s) => (
          <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 96, fontSize: 12, color: "var(--ink-2)" }}>{s.label}</span>
            <div style={{ flex: 1, height: 20, background: "var(--paper-3)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(s.count / max) * 100}%`, background: "var(--magenta)", opacity: 0.85 }} />
            </div>
            <span className="t-mono" style={{ width: 28, textAlign: "right", fontSize: 12, color: "var(--ink)" }}>{s.count}</span>
            <span className="t-mono" style={{ width: 44, textAlign: "right", fontSize: 11, color: "var(--ink-4)" }}>
              {s.conversionFromPrev === null ? "" : `${Math.round(s.conversionFromPrev * 100)}%`}
            </span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
        {data.biggestDrop
          ? `Biggest drop-off: ${data.biggestDrop.from} → ${data.biggestDrop.to} (${Math.round(data.biggestDrop.conversion * 100)}%).`
          : "Not enough data to spot a drop-off yet."}
        {" "}
        <span style={{ color: "var(--ink-4)" }}>{data.lostCount} lost (excluded).</span>
      </p>
    </div>
  );
}
