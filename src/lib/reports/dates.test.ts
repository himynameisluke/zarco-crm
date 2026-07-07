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
