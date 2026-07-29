import { expect, test } from "vitest";
import { computeProgress, effectiveProgress } from "./progress";

test("returns null when there are no tasks at all", () => {
  expect(computeProgress([])).toBeNull();
});

test("returns null when every task is cancelled (nothing countable)", () => {
  expect(
    computeProgress([{ status: "cancelled" }, { status: "cancelled" }]),
  ).toBeNull();
});

test("cancelled tasks are excluded from both numerator and denominator", () => {
  // 2 done out of 4 countable (2 done + 2 todo), the 2 cancelled dropped
  // entirely rather than counted as incomplete work.
  const tasks = [
    { status: "done" as const },
    { status: "done" as const },
    { status: "todo" as const },
    { status: "todo" as const },
    { status: "cancelled" as const },
    { status: "cancelled" as const },
  ];
  expect(computeProgress(tasks)).toBe(50);
});

test("0% when nothing is done yet", () => {
  expect(
    computeProgress([{ status: "todo" }, { status: "in_progress" }]),
  ).toBe(0);
});

test("100% when everything countable is done", () => {
  expect(computeProgress([{ status: "done" }, { status: "done" }])).toBe(100);
});

test("blocked tasks count as not-done (they aren't cancelled)", () => {
  expect(
    computeProgress([{ status: "done" }, { status: "blocked" }]),
  ).toBe(50);
});

test("rounds to the nearest integer percentage", () => {
  // 1 of 3 = 33.33...
  expect(
    computeProgress([
      { status: "done" },
      { status: "todo" },
      { status: "todo" },
    ]),
  ).toBe(33);
});

test("effectiveProgress uses the manual override when set", () => {
  const tasks = [{ status: "todo" as const }];
  expect(
    effectiveProgress({ progressManual: 75 }, tasks),
  ).toBe(75);
});

test("effectiveProgress respects a manual override of exactly 0", () => {
  // Regression guard: a naive `progressManual || computeProgress(...)`
  // would treat 0 as falsy and fall through to the computed value.
  const tasks = [{ status: "done" as const }, { status: "done" as const }];
  expect(effectiveProgress({ progressManual: 0 }, tasks)).toBe(0);
});

test("effectiveProgress falls back to computed progress when null", () => {
  const tasks = [{ status: "done" as const }, { status: "todo" as const }];
  expect(effectiveProgress({ progressManual: null }, tasks)).toBe(50);
});

test("effectiveProgress is null when unset and there's no countable work", () => {
  expect(effectiveProgress({ progressManual: null }, [])).toBeNull();
});
