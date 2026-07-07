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
