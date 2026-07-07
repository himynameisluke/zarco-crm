import { formatMoney } from "@/lib/format";
import type { RecurringResult } from "@/lib/reports/types";
import { StatTile } from "./report-card";

export function RecurringSummary({ data }: { data: RecurringResult }) {
  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
      <StatTile label="MRR" value={formatMoney(data.mrrPence)} />
      <StatTile label="ARR" value={formatMoney(data.arrPence)} />
      <StatTile
        label="Renewing ≤90d"
        value={String(data.renewingSoonCount)}
        sub={`${formatMoney(data.renewingSoonMrrPence)}/mo`}
      />
      <StatTile label="Renewed (period)" value={String(data.renewedInPeriod)} />
      <StatTile label="Lapsed (period)" value={String(data.lapsedInPeriod)} />
    </div>
  );
}
