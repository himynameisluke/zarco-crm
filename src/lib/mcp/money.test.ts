import { expect, test } from "vitest";
import { formatMoney, MONEY_UNITS_NOTE } from "./money";

test("formats GBP minor units as a human-readable string", () => {
  expect(formatMoney(1_500_000)).toBe("£15,000");
  expect(formatMoney(86_005_900)).toBe("£860,059");
  expect(formatMoney(0)).toBe("£0");
});

// The bug this exists to prevent: a model handed 113_000_000 pence read it as
// pounds and told a user "£113m" when the real figure was £1.13m. A formatted
// string cannot be misread, because there is no arithmetic left to get wrong.
test("the formatted value cannot be mistaken for the minor-unit integer", () => {
  expect(formatMoney(113_000_000)).toBe("£1,130,000");
  expect(formatMoney(113_000_000)).not.toContain("113,000,000");
});

test("null and undefined pass through rather than becoming £0", () => {
  expect(formatMoney(null)).toBeNull();
  expect(formatMoney(undefined)).toBeNull();
});

// Salesforce and other CRMs carry per-record currency. Formatting must follow the
// record's currency, and must respect currencies whose minor unit is not 1/100.
test("honours the record's currency", () => {
  expect(formatMoney(1_500_000, "USD")).toBe("$15,000");
  expect(formatMoney(1_500_000, "EUR")).toBe("€15,000");
});

test("respects currencies with no minor unit (JPY has 0 decimal places)", () => {
  expect(formatMoney(15_000, "JPY")).toBe("¥15,000");
});

test("an unknown currency code degrades to a labelled number, never a wrong symbol", () => {
  expect(formatMoney(1_500_000, "XYZ")).toContain("15,000");
});

test("the units note names both fields so a tool description can embed it", () => {
  expect(MONEY_UNITS_NOTE).toMatch(/valuePence/);
  expect(MONEY_UNITS_NOTE).toMatch(/value/);
});
