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
