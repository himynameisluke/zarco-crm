import type { WinLossResult } from "@/lib/reports/types";
import { StatTile } from "./report-card";

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export function WinLossBreakdown({ data }: { data: WinLossResult }) {
  const trendGlyph = data.trend === "up" ? "▲" : data.trend === "down" ? "▼" : data.trend === "flat" ? "–" : "";
  const trendColor = data.trend === "up" ? "var(--success)" : data.trend === "down" ? "var(--danger)" : "var(--ink-4)";
  const maxReason = Math.max(1, ...data.reasons.map((r) => r.count));

  return (
    <div>
      <div style={{ display: "flex", gap: 28, marginBottom: 20, flexWrap: "wrap", alignItems: "baseline" }}>
        <StatTile
          label="Win rate"
          value={pct(data.winRate)}
          sub={`${data.won} won · ${data.lost} lost`}
        />
        <span style={{ fontSize: 12, color: trendColor }}>
          {trendGlyph} vs prev {pct(data.prevWinRate)}
        </span>
      </div>
      {data.reasons.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>No lost deals in this period.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="t-eyebrow" style={{ fontSize: 9.5, color: "var(--ink-4)" }}>Why deals were lost</div>
          {data.reasons.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 110, fontSize: 12, color: "var(--ink-2)" }}>{r.label}</span>
              <div style={{ flex: 1, height: 14, background: "var(--paper-3)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(r.count / maxReason) * 100}%`, background: "var(--danger-edge)" }} />
              </div>
              <span className="t-mono" style={{ width: 24, textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
