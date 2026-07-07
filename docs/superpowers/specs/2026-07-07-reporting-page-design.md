# Reporting page (`/reports`) — design

**Date:** 2026-07-07
**Status:** Approved for planning
**Repo:** `~/Documents/code/zarco-crm` (Next.js 16 App Router · Drizzle · Supabase · Tailwind 4 + shadcn base-nova)

## Purpose

The existing **dashboard** answers *"what needs my attention right now"* (pipeline value, weighted forecast, win rate, closed-this-month, recent activity, tasks). Reporting is the **over-time / analytical layer** the dashboard deliberately doesn't cover. The data to power it now exists after the 2026-07-07 audit-fix session: stage-change history (`status_change` activities + `deals.stageChangedAt`), lost reasons (`deals.lostReason`), close dates, quote lifecycle timestamps, and the `contracts` table.

Audience: Luke, running Zarco (internal-only CRM, solo/small, retainer-heavy consultancy). Per-owner/rep reporting is explicitly **out of scope** (effectively single-user).

## Scope

Four modules, all approved:

1. **Revenue forecast** — forward-looking, weighted pipeline by expected-close month.
2. **Win/loss + why** — win-rate trend + lost-reason breakdown.
3. **Pipeline funnel** — current-snapshot funnel with stage-to-stage conversion.
4. **Recurring revenue** — MRR/ARR from contracts, renewals due, renewed-vs-lapsed.

Explicitly **out of v1** (YAGNI, easy to add later): per-owner leaderboards, goals/quota tracking, CSV export of reports, historical-cohort funnel.

## Page & navigation

- New route: `src/app/(app)/reports/page.tsx` — one server component, workspace-scoped via `requireCurrentWorkspace()` like every other page.
- New sidebar nav item **"Reports"** (icon: `BarChart3`), placed after **Renewals**. (Avoid the broken `Eye` lucide icon.)
- Layout: single column of four `<ReportCard>` sections, in the app's existing card/table language (mirror `/renewals`).
- **Period toggle**: `3m / 6m / 12m` chips via `?period=` (same GET-link pattern as the deals board filters). Default `6m`. It applies to:
  - **Win/loss** — the won/lost counts, win-rate, and previous-period trend.
  - **Recurring revenue** — only the "renewed/lapsed in period" counts.
  - It does **not** apply to: **Forecast** (always forward-looking, next 6 months), the **Funnel** (pure current snapshot — no time dimension), or the **MRR/ARR/renewing-soon** figures (always the current book).

## Architecture & data flow

Keep aggregation OUT of the page and out of one giant function. New module `src/lib/reports/`, one query function per report, each returning a plain typed object:

- `forecastByMonth(workspaceId): ForecastResult`
- `winLoss(workspaceId, period): WinLossResult`
- `pipelineFunnel(workspaceId): FunnelResult`
- `recurringRevenue(workspaceId, period): RecurringResult`

Each is independently unit-testable and could later be reused by MCP tools. The page calls all four (in parallel via `Promise.all`) and renders.

Presentational components in `src/components/reports/`, all pure/stateless (server-rendered):

- `<ReportCard>` — shared titled wrapper with an optional empty-state slot.
- `<ForecastBars>`, `<WinLossBreakdown>`, `<FunnelChart>`, `<RecurringSummary>` — bespoke visuals built from CSS bars + inline SVG. No charting library, no client components, no new dependencies (the dashboard's stage bar already proves this approach).

### Shared constants — single source of truth

`STAGE_WEIGHTS` currently lives privately in `src/components/dashboard/dashboard.tsx:48`. Extract it to `src/lib/deals/stage.ts` (or a new `src/lib/deals/weights.ts`) and import it in BOTH the dashboard and the forecast query, so the weighted-forecast math can never drift between the two surfaces. Values unchanged: `lead 0.1, qualified 0.25, proposal 0.5, negotiation 0.75, won 1, lost 0`.

`PERIODS_PER_YEAR` already exported from `src/app/(app)/renewals/schema.ts:42` — reuse it for MRR normalisation.

## Module details

### Revenue forecast — `forecastByMonth`

- Open deals only (`stage NOT IN (won, lost)`) with a `closeDate` in the next 6 calendar months, bucketed by close month.
- Per month: `grossPence` (sum of value) and `weightedPence` (sum of `value * STAGE_WEIGHTS[stage]`).
- Deals with a value but **no close date** go into a labelled `"No date"` bucket — never silently dropped.
- Summary tiles (a confidence ladder, all unambiguous):
  - **Weighted pipeline** — sum of `value * STAGE_WEIGHTS[stage]` over open deals (the realistic number).
  - **Best case** — sum of gross value over open deals (the ceiling).
  - **Won this month** — sum of value of `won` deals whose `closeDate` is in the current calendar month (banked context; matches the dashboard's existing "Closed this month" so the two never disagree).
- Render: stacked horizontal bars per month (weighted filled, gross as the lighter track) + the three tiles.

### Win/loss + why — `winLoss`

- Over the selected period (won/lost deals whose `stageChangedAt` falls in the window — `stageChangedAt` is NOT NULL so it's always present): counts of `won` vs `lost`.
- `winRate = won / (won + lost)` — guard divide-by-zero → render "—".
- Trend: same computation for the *previous* equal-length period; show ▲/▼/– vs current.
- Lost-reason breakdown: group `deals.lostReason` (free text) via `src/lib/reports/lost-reason.ts` — a keyword normaliser mapping to fixed buckets: **Price, Timing, Went in-house, Competitor, No decision, Other**. Deals lost with no reason → "Not recorded".
- Render: headline win-rate + trend, then horizontal bars for the reason buckets.

### Pipeline funnel — `pipelineFunnel`

- **Current snapshot** (approved): count of deals CURRENTLY in each of the six stages.
- Conversion between adjacent open stages: `count(stage_n) / count(stage_{n-1})` down the lead→…→won order; guard divide-by-zero.
- Identify the largest single stage-to-stage drop and surface it as a callout.
- `lost` shown separately (not in the linear funnel) so it doesn't distort ratios.
- Render: descending funnel bars with counts + conversion %, plus the "biggest drop" line.

### Recurring revenue — `recurringRevenue`

- `active` contracts only. Normalise each contract's `valuePence` to monthly using `PERIODS_PER_YEAR` → sum = **MRR**; `ARR = MRR * 12`.
- **Renewing ≤90d**: count + summed monthly value of active contracts with `endDate <= today + 90`.
- **Renewed / lapsed in period**: counts of contracts whose status became `renewed` / `lapsed` in the selected period (by `updatedAt` as a proxy, since there's no status-change log for contracts yet — note this limitation in the code).
- **NRR**: only render if computable from available data; otherwise omit rather than fabricate. (Likely omitted in v1 — flag as a follow-up needing a revenue-snapshot history.)
- Render: MRR + ARR tiles, renewing-soon tile, renewed/lapsed counts.

## Edge cases

- **Empty states** per module (no deals / no closed deals / no contracts): quiet "nothing to report yet" via the app's `EmptyState`, never a broken/NaN chart.
- **Money**: integer pence through all aggregation; format once at the render edge with existing `formatMoney`.
- **Division-by-zero**: guarded on every conversion %, win rate, MRR-derived ratio.
- **Pre-history deals**: won/lost deals that closed before the stage-history feature shipped have `stageChangedAt` defaulted to migration time, so the win/loss *timeline* attribution for those old deals is approximate (their "when" clusters at migration date). This affects which period bucket an old closed deal lands in, not the total win/loss counts. Acknowledged known limitation; self-corrects as new deals close.
- **Timezone**: month bucketing uses date-only (`YYYY-MM`) comparisons to avoid TZ drift, consistent with how `closeDate`/`endDate` are stored as `date`.

## Testing

The four query functions are the risk surface (SQL + math) and get unit tests against seeded fixtures:

- `winLoss`: win-rate math incl. zero-deal and all-won/all-lost edges; period vs previous-period trend.
- `pipelineFunnel`: conversion ratios, biggest-drop detection, empty stages.
- `forecastByMonth`: month bucketing, weighted vs gross sums, no-close-date bucket.
- `recurringRevenue`: MRR normalisation across all four billing periods; renewing-≤90d boundary.

Presentational components are trivial and are not unit-tested (covered by a manual browser eyeball on prod, consistent with this repo's verify practice).

## Non-goals / follow-ups noted

- Fixed lost-reason dropdown at mark-lost time (would make the normaliser unnecessary) — small follow-up if the keyword buckets prove noisy.
- Historical-cohort funnel toggle — add once months of `status_change` history accumulate.
- Contract status-change log (would make renewed/lapsed-in-period exact instead of `updatedAt`-proxy).
- MCP `get_report`-style tools reusing the `src/lib/reports/` functions.
