# Reporting Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/reports` page with four analytical modules — revenue forecast, win/loss + why, pipeline funnel, and recurring revenue — over the CRM data.

**Architecture:** Each report is a **pure compute function** (plain fetched rows + a reference date in, typed result out — no DB, no `server-only`, fully unit-tested). All four **DB-fetch wrappers** live in one `queries.ts` io-shell (workspace-scoped Drizzle queries that call the pure fns) — keeping every report query in one auditable place matters because this app bypasses RLS. One server-component page renders four stateless presentational components built from CSS bars + inline SVG (no charting library). Vitest is added for the pure functions.

**Why the split:** the pure files must be importable by vitest, which runs in a plain Node environment where `import "server-only"` throws and `@/lib/db` shouldn't be pulled in. Keeping compute pure and DB access isolated to `queries.ts` makes the math testable without a database.

**Tech Stack:** Next.js 16 (App Router, server components) · Drizzle · Vitest · Tailwind 4 + shadcn (base-nova) · inline-style/CSS-var visuals matching the existing `/renewals` page.

**Spec:** `docs/superpowers/specs/2026-07-07-reporting-page-design.md`

---

## File Structure

**Test infra**
- Create `vitest.config.ts` — vitest config with `@/` alias via `vite-tsconfig-paths`.
- Modify `package.json` — add `test` / `test:watch` scripts + `vitest`, `vite-tsconfig-paths` devDeps.

**Shared**
- Create `src/lib/deals/weights.ts` — `STAGE_WEIGHTS` extracted from dashboard (single source of truth).
- Modify `src/components/dashboard/dashboard.tsx` — import `STAGE_WEIGHTS` from the new module.
- Create `src/lib/reports/types.ts` — all report result types + `ReportPeriod`.
- Create `src/lib/reports/dates.ts` (+ `.test.ts`) — month-key / period helpers.

**Report logic** — pure compute fns (no DB, no `server-only`; each unit-tested)
- Create `src/lib/reports/lost-reason.ts` (+ `.test.ts`) — free-text → fixed buckets.
- Create `src/lib/reports/forecast.ts` (+ `.test.ts`).
- Create `src/lib/reports/win-loss.ts` (+ `.test.ts`).
- Create `src/lib/reports/funnel.ts` (+ `.test.ts`).
- Create `src/lib/reports/recurring.ts` (+ `.test.ts`).
- Create `src/lib/reports/queries.ts` — the single io-shell: all four workspace-scoped DB-fetch wrappers (`import "server-only"` + `@/lib/db`). Not unit-tested (thin queries; covered by the browser eyeball).

**UI**
- Create `src/components/reports/report-card.tsx` — shared titled wrapper.
- Create `src/components/reports/period-toggle.tsx` — 3m/6m/12m chips.
- Create `src/components/reports/forecast-bars.tsx`
- Create `src/components/reports/win-loss-breakdown.tsx`
- Create `src/components/reports/funnel-chart.tsx`
- Create `src/components/reports/recurring-summary.tsx`
- Create `src/app/(app)/reports/page.tsx` — the page.
- Modify `src/components/nav/sidebar.tsx` — add "Reports" nav item after "Renewals".

---

## Task 1: Add the vitest test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest + tsconfig-paths resolver**

Run:
```bash
cd "/Users/lukeburywood/Documents/code/zarco-crm" && pnpm add -D vitest vite-tsconfig-paths
```
Expected: both added under `devDependencies`.

- [ ] **Step 2: Create the vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Only unit-test pure logic under src/lib/reports; no DOM / DB needed.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add test scripts**

In `package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Smoke-test the runner**

Create `src/lib/reports/dates.test.ts` temporarily with:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```
Run: `pnpm test`
Expected: 1 passed. (This file is fleshed out for real in Task 3 — leave the smoke test in place; Task 3 replaces its contents.)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/lib/reports/dates.test.ts
git commit -m "test: add vitest runner for report logic"
```

---

## Task 2: Extract STAGE_WEIGHTS to a shared module

**Files:**
- Create: `src/lib/deals/weights.ts`
- Modify: `src/components/dashboard/dashboard.tsx:48-55`

- [ ] **Step 1: Create the shared weights module**

Create `src/lib/deals/weights.ts`:
```ts
import type { DealStage } from "@/app/(app)/deals/schema";

/**
 * Probability weight per pipeline stage — used for the weighted forecast on
 * BOTH the dashboard and the /reports forecast, so the two can never drift.
 */
export const STAGE_WEIGHTS: Record<DealStage, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
};
```

- [ ] **Step 2: Point the dashboard at it**

In `src/components/dashboard/dashboard.tsx`, delete the local `const STAGE_WEIGHTS: Record<DealStage, number> = { ... };` block (lines ~48-55) and add an import near the other `@/lib` imports:
```ts
import { STAGE_WEIGHTS } from "@/lib/deals/weights";
```

- [ ] **Step 3: Verify the dashboard still typechecks**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: exit 0 (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/deals/weights.ts src/components/dashboard/dashboard.tsx
git commit -m "refactor: extract STAGE_WEIGHTS to shared module"
```

---

## Task 3: Report types + date helpers

**Files:**
- Create: `src/lib/reports/types.ts`
- Create: `src/lib/reports/dates.ts`
- Test: `src/lib/reports/dates.test.ts`

- [ ] **Step 1: Create the types module**

Create `src/lib/reports/types.ts`:
```ts
import type { DealStage } from "@/app/(app)/deals/schema";

export type ReportPeriod = "3m" | "6m" | "12m";

export type ForecastMonth = {
  key: string; // "2026-08"
  label: string; // "Aug 2026"
  grossPence: number;
  weightedPence: number;
};
export type ForecastResult = {
  months: ForecastMonth[]; // next 6 calendar months
  noDatePence: number; // open deals with value but no closeDate
  weightedPipelinePence: number; // all open, stage-weighted
  bestCasePence: number; // all open, gross
  wonThisMonthPence: number; // won deals with closeDate in the current month
};

export type LostReasonBucket = { label: string; count: number };
export type WinLossResult = {
  won: number;
  lost: number;
  winRate: number | null; // null when won+lost === 0
  prevWinRate: number | null;
  trend: "up" | "down" | "flat" | null;
  reasons: LostReasonBucket[]; // sorted desc; includes "Not recorded"
};

export type FunnelStage = {
  stage: DealStage;
  label: string;
  count: number;
  conversionFromPrev: number | null; // null for the first stage
};
export type FunnelResult = {
  stages: FunnelStage[]; // lead → qualified → proposal → negotiation → won
  lostCount: number;
  biggestDrop: { from: string; to: string; conversion: number } | null;
};

export type RecurringResult = {
  mrrPence: number;
  arrPence: number;
  renewingSoonCount: number;
  renewingSoonMrrPence: number;
  renewedInPeriod: number;
  lapsedInPeriod: number;
};
```

- [ ] **Step 2: Write the failing date-helper tests**

Replace the contents of `src/lib/reports/dates.test.ts` with:
```ts
import { expect, test } from "vitest";
import { monthKey, monthKeyOf, monthLabel, nextMonthKeys, monthsAgo, periodMonths } from "./dates";

const AUG_2026 = new Date(Date.UTC(2026, 7, 15)); // month is 0-indexed

test("monthKey formats a Date as YYYY-MM", () => {
  expect(monthKey(AUG_2026)).toBe("2026-08");
});

test("monthKeyOf takes the YYYY-MM prefix of a date string", () => {
  expect(monthKeyOf("2026-08-31")).toBe("2026-08");
});

test("monthLabel renders a human month", () => {
  expect(monthLabel("2026-08")).toBe("Aug 2026");
});

test("nextMonthKeys returns count months starting from now's month", () => {
  expect(nextMonthKeys(AUG_2026, 3)).toEqual(["2026-08", "2026-09", "2026-10"]);
});

test("nextMonthKeys rolls over the year boundary", () => {
  const nov = new Date(Date.UTC(2026, 10, 1));
  expect(nextMonthKeys(nov, 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
});

test("monthsAgo subtracts calendar months", () => {
  expect(monthKey(monthsAgo(AUG_2026, 6))).toBe("2026-02");
});

test("periodMonths maps the toggle to a month count", () => {
  expect(periodMonths("3m")).toBe(3);
  expect(periodMonths("6m")).toBe(6);
  expect(periodMonths("12m")).toBe(12);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `./dates` has no such exports.

- [ ] **Step 4: Implement the date helpers**

Create `src/lib/reports/dates.ts`:
```ts
import type { ReportPeriod } from "./types";

// All month math is calendar-based in UTC. Deal/contract dates are stored as
// DATE (no time), so UTC avoids any timezone drift in bucketing.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-08-31" -> "2026-08" (a DATE column string). */
export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function nextMonthKeys(now: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))));
  }
  return keys;
}

export function monthsAgo(now: Date, n: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, now.getUTCDate()));
}

export function periodMonths(period: ReportPeriod): number {
  return period === "3m" ? 3 : period === "12m" ? 12 : 6;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/reports/types.ts src/lib/reports/dates.ts src/lib/reports/dates.test.ts
git commit -m "feat(reports): result types + date helpers"
```

---

## Task 4: Lost-reason normaliser

**Files:**
- Create: `src/lib/reports/lost-reason.ts`
- Test: `src/lib/reports/lost-reason.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports/lost-reason.test.ts`:
```ts
import { expect, test } from "vitest";
import { bucketLostReason, bucketLostReasons } from "./lost-reason";

test("classifies price-related reasons", () => {
  expect(bucketLostReason("Went with a competitor on price")).toBe("Competitor");
  expect(bucketLostReason("too expensive for their budget")).toBe("Price");
});

test("classifies timing / in-house / no-decision", () => {
  expect(bucketLostReason("bad timing, revisit next year")).toBe("Timing");
  expect(bucketLostReason("decided to build it in-house")).toBe("Went in-house");
  expect(bucketLostReason("went quiet, no decision made")).toBe("No decision");
});

test("null/empty reason becomes Not recorded", () => {
  expect(bucketLostReason(null)).toBe("Not recorded");
  expect(bucketLostReason("   ")).toBe("Not recorded");
});

test("unrecognised text falls to Other", () => {
  expect(bucketLostReason("random gibberish")).toBe("Other");
});

test("bucketLostReasons aggregates + sorts by count desc", () => {
  const result = bucketLostReasons([
    "too expensive",
    "price was too high",
    "went in-house",
    null,
  ]);
  expect(result[0]).toEqual({ label: "Price", count: 2 });
  expect(result).toContainEqual({ label: "Went in-house", count: 1 });
  expect(result).toContainEqual({ label: "Not recorded", count: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/reports/lost-reason.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the normaliser**

Create `src/lib/reports/lost-reason.ts`:
```ts
import type { LostReasonBucket } from "./types";

// Ordered: the FIRST matching bucket wins, so put more specific patterns
// ("competitor") before broader ones ("price") when text could match both.
const BUCKETS: { label: string; patterns: RegExp[] }[] = [
  { label: "Competitor", patterns: [/competitor|rival|another (vendor|agency|provider)|went with/i] },
  { label: "Price", patterns: [/price|pricing|expensive|cost|budget|too (high|much)|cheaper/i] },
  { label: "Went in-house", patterns: [/in.?house|internally|build.*(themselves|own)|diy/i] },
  { label: "Timing", patterns: [/timing|not (now|ready)|next (year|quarter)|revisit|postpone|delay/i] },
  { label: "No decision", patterns: [/no decision|went (quiet|cold)|ghost|no response|stalled|never (replied|responded)/i] },
];

export function bucketLostReason(reason: string | null | undefined): string {
  const text = (reason ?? "").trim();
  if (!text) return "Not recorded";
  for (const b of BUCKETS) {
    if (b.patterns.some((p) => p.test(text))) return b.label;
  }
  return "Other";
}

export function bucketLostReasons(reasons: (string | null | undefined)[]): LostReasonBucket[] {
  const counts = new Map<string, number>();
  for (const r of reasons) {
    const label = bucketLostReason(r);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/reports/lost-reason.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/lost-reason.ts src/lib/reports/lost-reason.test.ts
git commit -m "feat(reports): lost-reason keyword normaliser"
```

---

## Task 5: Forecast (compute + fetch)

**Files:**
- Create: `src/lib/reports/forecast.ts`
- Test: `src/lib/reports/forecast.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports/forecast.test.ts`:
```ts
import { expect, test } from "vitest";
import { computeForecast, type ForecastDealRow } from "./forecast";

const NOW = new Date(Date.UTC(2026, 7, 15)); // Aug 2026

const rows: ForecastDealRow[] = [
  { stage: "qualified", valuePence: 100000, closeDate: "2026-08-20" }, // this month, weight .25
  { stage: "proposal", valuePence: 200000, closeDate: "2026-09-10" }, // next month, weight .5
  { stage: "lead", valuePence: 50000, closeDate: null }, // no date, weight .1
  { stage: "won", valuePence: 300000, closeDate: "2026-08-02" }, // won this month
  { stage: "lost", valuePence: 999000, closeDate: "2026-08-05" }, // ignored
];

test("buckets open deals into the next 6 months by close month", () => {
  const r = computeForecast(rows, NOW);
  expect(r.months).toHaveLength(6);
  expect(r.months[0]).toMatchObject({ key: "2026-08", grossPence: 100000, weightedPence: 25000 });
  expect(r.months[1]).toMatchObject({ key: "2026-09", grossPence: 200000, weightedPence: 100000 });
});

test("open deals with no close date land in noDatePence, not a month", () => {
  const r = computeForecast(rows, NOW);
  expect(r.noDatePence).toBe(50000);
});

test("weighted pipeline and best case cover all open deals", () => {
  const r = computeForecast(rows, NOW);
  // open = qualified 100000*.25 + proposal 200000*.5 + lead 50000*.1 = 25000+100000+5000
  expect(r.weightedPipelinePence).toBe(130000);
  expect(r.bestCasePence).toBe(350000); // 100000+200000+50000
});

test("won this month sums won deals closing in the current month only", () => {
  const r = computeForecast(rows, NOW);
  expect(r.wonThisMonthPence).toBe(300000);
});

test("null values coalesce to zero", () => {
  const r = computeForecast([{ stage: "lead", valuePence: null, closeDate: "2026-08-01" }], NOW);
  expect(r.bestCasePence).toBe(0);
  expect(r.months[0].grossPence).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/reports/forecast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement compute + fetch**

Create `src/lib/reports/forecast.ts` (pure — no DB, no `server-only`):
```ts
import { STAGE_WEIGHTS } from "@/lib/deals/weights";
import type { DealStage } from "@/app/(app)/deals/schema";
import type { ForecastResult } from "./types";
import { monthKey, monthKeyOf, monthLabel, nextMonthKeys } from "./dates";

export type ForecastDealRow = {
  stage: DealStage;
  valuePence: number | null;
  closeDate: string | null;
};

/** Pure: bucket + weight deals for the forecast. `now` is injected for tests. */
export function computeForecast(rows: ForecastDealRow[], now: Date): ForecastResult {
  const keys = nextMonthKeys(now, 6);
  const gross = new Map<string, number>(keys.map((k) => [k, 0]));
  const weighted = new Map<string, number>(keys.map((k) => [k, 0]));

  let noDatePence = 0;
  let weightedPipelinePence = 0;
  let bestCasePence = 0;
  let wonThisMonthPence = 0;
  const thisMonth = monthKey(now);

  for (const row of rows) {
    const value = row.valuePence ?? 0;
    const isOpen = row.stage !== "won" && row.stage !== "lost";

    if (isOpen) {
      weightedPipelinePence += Math.round(value * STAGE_WEIGHTS[row.stage]);
      bestCasePence += value;
      if (!row.closeDate) {
        noDatePence += value;
      } else {
        const k = monthKeyOf(row.closeDate);
        if (gross.has(k)) {
          gross.set(k, gross.get(k)! + value);
          weighted.set(k, weighted.get(k)! + Math.round(value * STAGE_WEIGHTS[row.stage]));
        }
      }
    } else if (row.stage === "won" && row.closeDate && monthKeyOf(row.closeDate) === thisMonth) {
      wonThisMonthPence += value;
    }
  }

  return {
    months: keys.map((key) => ({
      key,
      label: monthLabel(key),
      grossPence: gross.get(key)!,
      weightedPence: weighted.get(key)!,
    })),
    noDatePence,
    weightedPipelinePence,
    bestCasePence,
    wonThisMonthPence,
  };
}
```
(The workspace-scoped fetch wrapper `forecastByMonth` is added in `queries.ts` in Task 10.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/reports/forecast.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/forecast.ts src/lib/reports/forecast.test.ts
git commit -m "feat(reports): revenue forecast compute"
```

---

## Task 6: Win/loss (compute + fetch)

**Files:**
- Create: `src/lib/reports/win-loss.ts`
- Test: `src/lib/reports/win-loss.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports/win-loss.test.ts`:
```ts
import { expect, test } from "vitest";
import { computeWinLoss, type WinLossDealRow } from "./win-loss";

const NOW = new Date(Date.UTC(2026, 7, 15)); // Aug 2026
const d = (isoDay: string) => new Date(`${isoDay}T00:00:00Z`);

// 6m window = [2026-02-15, 2026-08-15]; previous = [2025-08-15, 2026-02-15]
const rows: WinLossDealRow[] = [
  { stage: "won", stageChangedAt: d("2026-07-01"), lostReason: null },
  { stage: "won", stageChangedAt: d("2026-06-01"), lostReason: null },
  { stage: "lost", stageChangedAt: d("2026-05-01"), lostReason: "too expensive" },
  { stage: "lost", stageChangedAt: d("2026-04-01"), lostReason: null },
  { stage: "won", stageChangedAt: d("2025-12-01"), lostReason: null }, // previous window
  { stage: "lost", stageChangedAt: d("2025-11-01"), lostReason: "bad timing" }, // previous window
];

test("counts won/lost inside the current window", () => {
  const r = computeWinLoss(rows, NOW, "6m");
  expect(r.won).toBe(2);
  expect(r.lost).toBe(2);
  expect(r.winRate).toBeCloseTo(0.5);
});

test("computes previous-period win rate and a trend", () => {
  const r = computeWinLoss(rows, NOW, "6m");
  // previous window: 1 won, 1 lost => 0.5; current 0.5 => flat
  expect(r.prevWinRate).toBeCloseTo(0.5);
  expect(r.trend).toBe("flat");
});

test("win rate is null when there are no decided deals in-window", () => {
  const r = computeWinLoss([], NOW, "6m");
  expect(r.winRate).toBeNull();
  expect(r.trend).toBeNull();
});

test("lost reasons are bucketed for the current window", () => {
  const r = computeWinLoss(rows, NOW, "6m");
  expect(r.reasons).toContainEqual({ label: "Price", count: 1 });
  expect(r.reasons).toContainEqual({ label: "Not recorded", count: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/reports/win-loss.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement compute + fetch**

Create `src/lib/reports/win-loss.ts` (pure — no DB, no `server-only`):
```ts
import type { ReportPeriod, WinLossResult } from "./types";
import { monthsAgo, periodMonths } from "./dates";
import { bucketLostReasons } from "./lost-reason";

export type WinLossDealRow = {
  stage: "won" | "lost";
  stageChangedAt: Date;
  lostReason: string | null;
};

function rate(won: number, lost: number): number | null {
  return won + lost === 0 ? null : won / (won + lost);
}

export function computeWinLoss(
  rows: WinLossDealRow[],
  now: Date,
  period: ReportPeriod,
): WinLossResult {
  const n = periodMonths(period);
  const curStart = monthsAgo(now, n);
  const prevStart = monthsAgo(now, n * 2);

  let won = 0;
  let lost = 0;
  let prevWon = 0;
  let prevLost = 0;
  const currentLostReasons: (string | null)[] = [];

  for (const row of rows) {
    const t = row.stageChangedAt;
    if (t >= curStart && t <= now) {
      if (row.stage === "won") won++;
      else {
        lost++;
        currentLostReasons.push(row.lostReason);
      }
    } else if (t >= prevStart && t < curStart) {
      if (row.stage === "won") prevWon++;
      else prevLost++;
    }
  }

  const winRate = rate(won, lost);
  const prevWinRate = rate(prevWon, prevLost);
  let trend: WinLossResult["trend"] = null;
  if (winRate !== null && prevWinRate !== null) {
    trend = winRate > prevWinRate ? "up" : winRate < prevWinRate ? "down" : "flat";
  }

  return {
    won,
    lost,
    winRate,
    prevWinRate,
    trend,
    reasons: bucketLostReasons(currentLostReasons),
  };
}
```
(The workspace-scoped fetch wrapper `winLoss` is added in `queries.ts` in Task 10.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/reports/win-loss.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/win-loss.ts src/lib/reports/win-loss.test.ts
git commit -m "feat(reports): win/loss compute"
```

---

## Task 7: Pipeline funnel (compute + fetch)

**Files:**
- Create: `src/lib/reports/funnel.ts`
- Test: `src/lib/reports/funnel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports/funnel.test.ts`:
```ts
import { expect, test } from "vitest";
import { computeFunnel, type FunnelDealRow } from "./funnel";

const rows: FunnelDealRow[] = [
  ...Array(10).fill({ stage: "lead" }),
  ...Array(7).fill({ stage: "qualified" }),
  ...Array(4).fill({ stage: "proposal" }),
  ...Array(2).fill({ stage: "negotiation" }),
  ...Array(2).fill({ stage: "won" }),
  ...Array(3).fill({ stage: "lost" }),
];

test("counts deals per open stage in funnel order", () => {
  const r = computeFunnel(rows);
  expect(r.stages.map((s) => s.count)).toEqual([10, 7, 4, 2, 2]);
  expect(r.stages[0].stage).toBe("lead");
  expect(r.stages[4].stage).toBe("won");
});

test("conversion is ratio to the previous stage; first is null", () => {
  const r = computeFunnel(rows);
  expect(r.stages[0].conversionFromPrev).toBeNull();
  expect(r.stages[1].conversionFromPrev).toBeCloseTo(0.7); // 7/10
  expect(r.stages[2].conversionFromPrev).toBeCloseTo(4 / 7);
});

test("lost is counted separately, not in the funnel", () => {
  expect(computeFunnel(rows).lostCount).toBe(3);
});

test("identifies the biggest stage-to-stage drop", () => {
  const r = computeFunnel(rows);
  // conversions: q .70, p .571, n .50, won 1.0 -> smallest is negotiation .50
  expect(r.biggestDrop).toMatchObject({ from: "Proposal", to: "Negotiation" });
});

test("division-by-zero guard: empty previous stage yields null conversion", () => {
  const r = computeFunnel([{ stage: "proposal" }]);
  expect(r.stages[1].conversionFromPrev).toBeNull(); // qualified is 0
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/reports/funnel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement compute + fetch**

Create `src/lib/reports/funnel.ts` (pure — no DB, no `server-only`):
```ts
import { DEAL_STAGE_LABELS, type DealStage } from "@/app/(app)/deals/schema";
import type { FunnelResult } from "./types";

export type FunnelDealRow = { stage: DealStage };

// The linear funnel excludes 'lost' (a terminal side-exit, not a step).
const FUNNEL_ORDER: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "won"];

export function computeFunnel(rows: FunnelDealRow[]): FunnelResult {
  const counts = new Map<DealStage, number>();
  for (const row of rows) counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);

  const stages = FUNNEL_ORDER.map((stage, i) => {
    const count = counts.get(stage) ?? 0;
    const prevCount = i === 0 ? null : counts.get(FUNNEL_ORDER[i - 1]) ?? 0;
    const conversionFromPrev =
      prevCount === null || prevCount === 0 ? null : count / prevCount;
    return { stage, label: DEAL_STAGE_LABELS[stage], count, conversionFromPrev };
  });

  let biggestDrop: FunnelResult["biggestDrop"] = null;
  for (let i = 1; i < stages.length; i++) {
    const c = stages[i].conversionFromPrev;
    if (c === null) continue;
    if (biggestDrop === null || c < biggestDrop.conversion) {
      biggestDrop = { from: stages[i - 1].label, to: stages[i].label, conversion: c };
    }
  }

  return { stages, lostCount: counts.get("lost") ?? 0, biggestDrop };
}
```
(The workspace-scoped fetch wrapper `pipelineFunnel` is added in `queries.ts` in Task 10.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/reports/funnel.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/funnel.ts src/lib/reports/funnel.test.ts
git commit -m "feat(reports): pipeline funnel compute"
```

---

## Task 8: Recurring revenue (compute + fetch)

**Files:**
- Create: `src/lib/reports/recurring.ts`
- Test: `src/lib/reports/recurring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports/recurring.test.ts`:
```ts
import { expect, test } from "vitest";
import { computeRecurring, type ContractRow } from "./recurring";

const NOW = new Date(Date.UTC(2026, 7, 15)); // Aug 2026
const d = (isoDay: string) => new Date(`${isoDay}T00:00:00Z`);

const rows: ContractRow[] = [
  { status: "active", valuePence: 200000, billingPeriod: "monthly", endDate: "2026-09-01", updatedAt: d("2026-01-01") }, // £2000/mo, renewing soon
  { status: "active", valuePence: 1200000, billingPeriod: "annual", endDate: "2027-06-01", updatedAt: d("2026-01-01") }, // £12000/yr = £1000/mo
  { status: "active", valuePence: 500000, billingPeriod: "one_off", endDate: "2026-10-01", updatedAt: d("2026-01-01") }, // excluded from MRR
  { status: "renewed", valuePence: 300000, billingPeriod: "monthly", endDate: "2026-05-01", updatedAt: d("2026-06-01") },
  { status: "lapsed", valuePence: 100000, billingPeriod: "monthly", endDate: "2026-03-01", updatedAt: d("2026-04-01") },
];

test("MRR normalises each active recurring contract to monthly (one_off excluded)", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.mrrPence).toBe(300000); // 200000 + 100000
  expect(r.arrPence).toBe(3600000);
});

test("renewing soon = active contracts ending within 90 days", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.renewingSoonCount).toBe(1); // only the 2026-09-01 one
  expect(r.renewingSoonMrrPence).toBe(200000);
});

test("renewed/lapsed counted when updatedAt falls in the period", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.renewedInPeriod).toBe(1);
  expect(r.lapsedInPeriod).toBe(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/reports/recurring.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement compute + fetch**

Create `src/lib/reports/recurring.ts` (pure — no DB, no `server-only`):
```ts
import {
  PERIODS_PER_YEAR,
  type ContractBillingPeriod,
  type ContractStatus,
} from "@/app/(app)/renewals/schema";
import type { RecurringResult, ReportPeriod } from "./types";
import { monthsAgo, periodMonths } from "./dates";

export type ContractRow = {
  status: ContractStatus;
  valuePence: number | null;
  billingPeriod: ContractBillingPeriod;
  endDate: string; // DATE column, YYYY-MM-DD
  updatedAt: Date;
};

/** Per-period contract value → monthly pence. one_off is not recurring → 0. */
function monthlyPence(valuePence: number, period: ContractBillingPeriod): number {
  if (period === "one_off") return 0;
  return Math.round((valuePence * PERIODS_PER_YEAR[period]) / 12);
}

export function computeRecurring(
  rows: ContractRow[],
  now: Date,
  period: ReportPeriod,
): RecurringResult {
  const soonCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90));
  const soonCutoffKey = soonCutoff.toISOString().slice(0, 10);
  const nowKey = now.toISOString().slice(0, 10);
  const periodStart = monthsAgo(now, periodMonths(period));

  let mrrPence = 0;
  let renewingSoonCount = 0;
  let renewingSoonMrrPence = 0;
  let renewedInPeriod = 0;
  let lapsedInPeriod = 0;

  for (const row of rows) {
    const value = row.valuePence ?? 0;
    if (row.status === "active") {
      const monthly = monthlyPence(value, row.billingPeriod);
      mrrPence += monthly;
      // one_off contracts don't renew — exclude them from "renewing soon".
      if (
        row.billingPeriod !== "one_off" &&
        row.endDate >= nowKey &&
        row.endDate <= soonCutoffKey
      ) {
        renewingSoonCount++;
        renewingSoonMrrPence += monthly;
      }
    }
    if (row.updatedAt >= periodStart && row.updatedAt <= now) {
      if (row.status === "renewed") renewedInPeriod++;
      else if (row.status === "lapsed") lapsedInPeriod++;
    }
  }

  return {
    mrrPence,
    arrPence: mrrPence * 12,
    renewingSoonCount,
    renewingSoonMrrPence,
    renewedInPeriod,
    lapsedInPeriod,
  };
}
```
(The workspace-scoped fetch wrapper `recurringRevenue` is added in `queries.ts` in Task 10.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/reports/recurring.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/recurring.ts src/lib/reports/recurring.test.ts
git commit -m "feat(reports): recurring revenue compute"
```

---

## Task 9: Presentational components

**Files:**
- Create: `src/components/reports/report-card.tsx`
- Create: `src/components/reports/period-toggle.tsx`
- Create: `src/components/reports/forecast-bars.tsx`
- Create: `src/components/reports/win-loss-breakdown.tsx`
- Create: `src/components/reports/funnel-chart.tsx`
- Create: `src/components/reports/recurring-summary.tsx`

All are stateless server components using inline styles + CSS vars, matching `/renewals`.

- [ ] **Step 1: ReportCard wrapper**

Create `src/components/reports/report-card.tsx`:
```tsx
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
```

- [ ] **Step 2: PeriodToggle**

Create `src/components/reports/period-toggle.tsx`:
```tsx
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
```

- [ ] **Step 3: ForecastBars**

Create `src/components/reports/forecast-bars.tsx`:
```tsx
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
```

- [ ] **Step 4: WinLossBreakdown**

Create `src/components/reports/win-loss-breakdown.tsx`:
```tsx
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
```

- [ ] **Step 5: FunnelChart**

Create `src/components/reports/funnel-chart.tsx`:
```tsx
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
```

- [ ] **Step 6: RecurringSummary**

Create `src/components/reports/recurring-summary.tsx`:
```tsx
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
```

- [ ] **Step 7: Typecheck the components**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/reports/
git commit -m "feat(reports): presentational components"
```

---

## Task 10: DB query io-shell + `/reports` page + nav

**Files:**
- Create: `src/lib/reports/queries.ts`
- Create: `src/app/(app)/reports/page.tsx`
- Modify: `src/components/nav/sidebar.tsx`

- [ ] **Step 1: Create the query io-shell**

All four workspace-scoped fetch wrappers in one place (the only file here that touches `@/lib/db`). Create `src/lib/reports/queries.ts`:
```ts
import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { contracts, deals } from "@/lib/db/schema";
import type {
  ForecastResult,
  FunnelResult,
  RecurringResult,
  ReportPeriod,
  WinLossResult,
} from "./types";
import { computeForecast } from "./forecast";
import { computeWinLoss, type WinLossDealRow } from "./win-loss";
import { computeFunnel } from "./funnel";
import { computeRecurring, type ContractRow } from "./recurring";

export async function forecastByMonth(workspaceId: string): Promise<ForecastResult> {
  const rows = await db
    .select({ stage: deals.stage, valuePence: deals.valuePence, closeDate: deals.closeDate })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));
  return computeForecast(rows, new Date());
}

export async function winLoss(workspaceId: string, period: ReportPeriod): Promise<WinLossResult> {
  const rows = await db
    .select({
      stage: deals.stage,
      stageChangedAt: deals.stageChangedAt,
      lostReason: deals.lostReason,
    })
    .from(deals)
    .where(and(eq(deals.workspaceId, workspaceId), inArray(deals.stage, ["won", "lost"])));
  return computeWinLoss(rows as WinLossDealRow[], new Date(), period);
}

export async function pipelineFunnel(workspaceId: string): Promise<FunnelResult> {
  const rows = await db
    .select({ stage: deals.stage })
    .from(deals)
    .where(eq(deals.workspaceId, workspaceId));
  return computeFunnel(rows);
}

export async function recurringRevenue(
  workspaceId: string,
  period: ReportPeriod,
): Promise<RecurringResult> {
  const rows = await db
    .select({
      status: contracts.status,
      valuePence: contracts.valuePence,
      billingPeriod: contracts.billingPeriod,
      endDate: contracts.endDate,
      updatedAt: contracts.updatedAt,
    })
    .from(contracts)
    .where(eq(contracts.workspaceId, workspaceId));
  return computeRecurring(rows as ContractRow[], new Date(), period);
}
```

- [ ] **Step 2: Build the page**

Create `src/app/(app)/reports/page.tsx`:
```tsx
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
```

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/nav/sidebar.tsx`: add `BarChart3` to the lucide import list, and add a nav entry immediately after the Renewals line (`{ href: "/renewals", label: "Renewals", icon: RefreshCw },`):
```ts
  { href: "/reports", label: "Reports", icon: BarChart3 },
```

- [ ] **Step 4: Typecheck + build**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json && pnpm build 2>&1 | tail -5`
Expected: tsc exit 0; build "✓ Compiled successfully" and `/reports` listed among the routes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/queries.ts "src/app/(app)/reports/page.tsx" src/components/nav/sidebar.tsx
git commit -m "feat(reports): query io-shell, /reports page + sidebar nav"
```

---

## Task 11: Full test run, deploy, browser verify

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite + typecheck**

Run: `pnpm test && node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: all report tests pass; tsc exit 0.

- [ ] **Step 2: Push (auto-deploys via Vercel)**

```bash
git push origin main
```

- [ ] **Step 3: Browser-verify on prod**

Open `https://zarco-crm.vercel.app/reports`. Confirm:
- All four cards render with real numbers (the Zarco workspace has ~22 open deals + contracts).
- The forecast "Weighted pipeline" tile matches the dashboard's weighted-forecast figure (shared `STAGE_WEIGHTS`).
- The `3m / 6m / 12m` toggle changes the Win/loss counts and the URL (`?period=`).
- The "Reports" sidebar item is present after "Renewals" and highlights when active.
- Screenshot each card for the record.

- [ ] **Step 4: Done**

No cleanup — reports are read-only over existing data.

---

## Notes for the implementer

- **RLS is bypassed** in this app; every fetch wrapper MUST scope by `workspaceId` (they do). Never add a report query that isn't workspace-scoped.
- The pure compute functions take an injected `now: Date` specifically so tests are deterministic — never call `new Date()` inside them; only the fetch wrappers do.
- Money stays in integer **pence** end to end; format only at the render edge with `formatMoney`.
- Do **not** import the broken lucide `Eye` icon anywhere; `BarChart3` is fine.
- If `pnpm test` can't resolve `@/…` imports, confirm `vite-tsconfig-paths` is in the vitest config plugins (Task 1).
