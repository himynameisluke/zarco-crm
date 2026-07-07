import { formatMoney } from "@/lib/format";
import type { ForecastResult } from "@/lib/reports/types";
import { StatTile } from "./report-card";

export function ForecastBars({ data }: { data: ForecastResult }) {
  const max = Math.max(1, ...data.months.map((m) => m.grossPence));
  return (
    <div>
      <div style={{ display: "flex", gap: 28, marginBottom: 20, flexWrap: "wrap" }}>
        <StatTile label="Weighted pipeline" value={formatMoney(data.weightedPipelinePence)} />
        <StatTile label="Best case" value={formatMoney(data.bestCasePence)} />
        <StatTile label="Won this month" value={formatMoney(data.wonThisMonthPence)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.months.map((m) => (
          <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="t-mono" style={{ width: 64, fontSize: 11, color: "var(--ink-3)" }}>
              {m.label}
            </span>
            <div style={{ flex: 1, position: "relative", height: 18, background: "var(--paper-3)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${(m.grossPence / max) * 100}%`, background: "var(--ink-20)" }} />
              <div style={{ position: "absolute", inset: 0, width: `${(m.weightedPence / max) * 100}%`, background: "var(--magenta)" }} />
            </div>
            <span className="t-num" style={{ width: 92, textAlign: "right", fontSize: 12, color: "var(--ink-2)" }}>
              {formatMoney(m.weightedPence)}
            </span>
          </div>
        ))}
      </div>
      {data.noDatePence > 0 ? (
        <p style={{ marginTop: 12, fontSize: 11, color: "var(--ink-4)" }}>
          + {formatMoney(data.noDatePence)} in open deals with no close date (not bucketed).
        </p>
      ) : null}
    </div>
  );
}
