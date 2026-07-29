import type { ProjectMetrics } from "@/lib/projects/metrics";

type Tone = "default" | "warn" | "danger" | "ok";

const TONE_COLOR: Record<Tone, string> = {
  default: "var(--ink)",
  warn: "var(--warning)",
  danger: "var(--danger)",
  ok: "var(--success)",
};

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 20px" }}>
      <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
        {label}
      </span>
      <span
        className="t-num"
        style={{ fontSize: 21, letterSpacing: "-0.02em", color: TONE_COLOR[tone] }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A ledger row, not a card grid — seven numbers you scan left to right in
 * one glance, dividers doing the separating instead of seven boxed tiles
 * repeating the same chrome. Real data via overviewMetrics; nothing here
 * is filtered by the current view/search (it's the workspace-wide state
 * of delivery, independent of what the table/board happen to be showing).
 */
export function MetricCards({ metrics }: { metrics: ProjectMetrics }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        flexWrap: "wrap",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <Metric label="Active" value={String(metrics.active)} />
      <Divider />
      <Metric
        label="At risk"
        value={String(metrics.atRisk)}
        tone={metrics.atRisk > 0 ? "warn" : "default"}
      />
      <Divider />
      <Metric
        label="Blocked"
        value={String(metrics.blocked)}
        tone={metrics.blocked > 0 ? "danger" : "default"}
      />
      <Divider />
      <Metric
        label="Overdue tasks"
        value={String(metrics.overdueTasks)}
        tone={metrics.overdueTasks > 0 ? "danger" : "default"}
      />
      <Divider />
      <Metric label="Due this week" value={String(metrics.dueThisWeek)} />
      <Divider />
      <Metric
        label="Avg progress"
        value={metrics.avgProgress != null ? `${metrics.avgProgress}%` : "—"}
      />
      <Divider />
      <Metric
        label="Completed this month"
        value={String(metrics.completedThisMonth)}
        tone={metrics.completedThisMonth > 0 ? "ok" : "default"}
      />
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: "var(--hairline)", flexShrink: 0 }} />;
}
