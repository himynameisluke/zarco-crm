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
