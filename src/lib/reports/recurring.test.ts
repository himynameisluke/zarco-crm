import { expect, test } from "vitest";
import { computeRecurring, type ContractRow } from "./recurring";

const NOW = new Date(Date.UTC(2026, 7, 15)); // Aug 2026
const d = (isoDay: string) => new Date(`${isoDay}T00:00:00Z`);

const rows: ContractRow[] = [
  { status: "active", valuePence: 200000, billingPeriod: "monthly", endDate: "2026-09-01", updatedAt: d("2026-01-01") }, // £2000/mo, renewing soon
  { status: "active", valuePence: 1200000, billingPeriod: "annual", endDate: "2027-06-01", updatedAt: d("2026-01-01") }, // £12000/yr = £1000/mo
  { status: "active", valuePence: 500000, billingPeriod: "one_off", endDate: "2026-10-01", updatedAt: d("2026-01-01") }, // excluded from MRR
  { status: "renewed", valuePence: 300000, billingPeriod: "monthly", endDate: "2026-05-01", updatedAt: d("2026-06-01") },
  { status: "lapsed", valuePence: 100000, billingPeriod: "monthly", endDate: "2026-03-01", updatedAt: d("2026-04-01") },
];

test("MRR normalises each active recurring contract to monthly (one_off excluded)", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.mrrPence).toBe(300000); // 200000 + 100000
  expect(r.arrPence).toBe(3600000);
});

test("renewing soon = active contracts ending within 90 days", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.renewingSoonCount).toBe(1); // only the 2026-09-01 one
  expect(r.renewingSoonMrrPence).toBe(200000);
});

test("renewed/lapsed counted when updatedAt falls in the period", () => {
  const r = computeRecurring(rows, NOW, "6m");
  expect(r.renewedInPeriod).toBe(1);
  expect(r.lapsedInPeriod).toBe(1);
});
