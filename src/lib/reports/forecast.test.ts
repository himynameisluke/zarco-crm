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
