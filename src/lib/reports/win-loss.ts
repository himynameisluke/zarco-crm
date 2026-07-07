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
