import Link from "next/link";
import type { ReportPeriod } from "@/lib/reports/types";

const PERIODS: ReportPeriod[] = ["3m", "6m", "12m"];

export function PeriodToggle({ current }: { current: ReportPeriod }) {
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {PERIODS.map((p) => {
        const active = p === current;
        return (
          <Link
            key={p}
            href={`/reports?period=${p}`}
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              textDecoration: "none",
              border: `1px solid ${active ? "var(--magenta)" : "var(--hairline)"}`,
              color: active ? "var(--magenta)" : "var(--ink-3)",
              background: active ? "var(--paper-3)" : "transparent",
            }}
          >
            {p}
          </Link>
        );
      })}
    </span>
  );
}
