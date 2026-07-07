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
