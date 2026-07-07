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

test("all-won current window gives winRate 1", () => {
  const allWon: WinLossDealRow[] = [
    { stage: "won", stageChangedAt: d("2026-07-01"), lostReason: null },
    { stage: "won", stageChangedAt: d("2026-06-01"), lostReason: null },
  ];
  const r = computeWinLoss(allWon, NOW, "6m");
  expect(r.winRate).toBe(1);
});

test("all-lost current window gives winRate 0", () => {
  const allLost: WinLossDealRow[] = [
    { stage: "lost", stageChangedAt: d("2026-07-01"), lostReason: "too expensive" },
    { stage: "lost", stageChangedAt: d("2026-06-01"), lostReason: null },
  ];
  const r = computeWinLoss(allLost, NOW, "6m");
  expect(r.winRate).toBe(0);
});

test("trend is up when current win rate beats the previous window", () => {
  const trendUp: WinLossDealRow[] = [
    // current window: 2 won, 0 lost => 1.0
    { stage: "won", stageChangedAt: d("2026-07-01"), lostReason: null },
    { stage: "won", stageChangedAt: d("2026-06-01"), lostReason: null },
    // previous window: 1 won, 1 lost => 0.5
    { stage: "won", stageChangedAt: d("2025-12-01"), lostReason: null },
    { stage: "lost", stageChangedAt: d("2025-11-01"), lostReason: null },
  ];
  const r = computeWinLoss(trendUp, NOW, "6m");
  expect(r.trend).toBe("up");
});

test("trend is down when current win rate trails the previous window", () => {
  const trendDown: WinLossDealRow[] = [
    // current window: 1 won, 1 lost => 0.5
    { stage: "won", stageChangedAt: d("2026-07-01"), lostReason: null },
    { stage: "lost", stageChangedAt: d("2026-06-01"), lostReason: null },
    // previous window: 2 won, 0 lost => 1.0
    { stage: "won", stageChangedAt: d("2025-12-01"), lostReason: null },
    { stage: "won", stageChangedAt: d("2025-11-01"), lostReason: null },
  ];
  const r = computeWinLoss(trendDown, NOW, "6m");
  expect(r.trend).toBe("down");
});

test("lost reasons do not leak from the previous window", () => {
  const r = computeWinLoss(rows, NOW, "6m");
  // "bad timing" is a previous-window lost deal; it must not appear.
  expect(r.reasons.find((x) => x.label === "Timing")).toBeUndefined();
});
