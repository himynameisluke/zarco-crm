import { BarChart3 } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { ReportCard } from "@/components/reports/report-card";
import { PeriodToggle } from "@/components/reports/period-toggle";
import { ForecastBars } from "@/components/reports/forecast-bars";
import { WinLossBreakdown } from "@/components/reports/win-loss-breakdown";
import { FunnelChart } from "@/components/reports/funnel-chart";
import { RecurringSummary } from "@/components/reports/recurring-summary";
import {
  forecastByMonth,
  winLoss,
  pipelineFunnel,
  recurringRevenue,
} from "@/lib/reports/queries";
import type { ReportPeriod } from "@/lib/reports/types";

function parsePeriod(v: string | undefined): ReportPeriod {
  return v === "3m" || v === "12m" ? v : "6m";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const period = parsePeriod((await searchParams).period);

  const [forecast, wl, funnel, recurring] = await Promise.all([
    forecastByMonth(workspace.id),
    winLoss(workspace.id, period),
    pipelineFunnel(workspace.id),
    recurringRevenue(workspace.id, period),
  ]);

  const totalDeals = funnel.stages.reduce((n, s) => n + s.count, 0) + funnel.lostCount;

  return (
    <>
      <Topbar
        crumbs={[{ icon: BarChart3, label: "Reports" }]}
        actions={<PeriodToggle current={period} />}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          {totalDeals === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={BarChart3}
                title="Nothing to report yet"
                description="Once you have deals in the pipeline, forecasts, win/loss, and funnel analytics will appear here."
              />
            </div>
          ) : (
            <>
              <ReportCard title="Revenue forecast" hint="open pipeline by expected close — next 6 months">
                <ForecastBars data={forecast} />
              </ReportCard>
              <ReportCard title="Win / loss" hint={`decided deals · last ${period}`}>
                <WinLossBreakdown data={wl} />
              </ReportCard>
              <ReportCard title="Pipeline funnel" hint="deals by stage right now">
                <FunnelChart data={funnel} />
              </ReportCard>
              <ReportCard title="Recurring revenue" hint="active contracts book">
                <RecurringSummary data={recurring} />
              </ReportCard>
            </>
          )}
        </div>
      </main>
    </>
  );
}
