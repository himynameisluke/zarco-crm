import { describe, expect, it } from "vitest";

import { businessDateString } from "./business";

describe("businessDateString", () => {
  it("rolls to the next day at UK midnight during BST (UTC+1)", () => {
    // 23:30 UTC on the 2nd is 00:30 BST on the 3rd — the business day is the 3rd.
    expect(businessDateString(new Date("2026-08-02T23:30:00Z"))).toBe(
      "2026-08-03",
    );
  });

  it("matches the UTC date during GMT (winter)", () => {
    expect(businessDateString(new Date("2026-01-15T23:30:00Z"))).toBe(
      "2026-01-15",
    );
  });

  it("matches the UTC date at midday year-round", () => {
    expect(businessDateString(new Date("2026-08-03T12:00:00Z"))).toBe(
      "2026-08-03",
    );
    expect(businessDateString(new Date("2026-01-15T12:00:00Z"))).toBe(
      "2026-01-15",
    );
  });

  it("respects an explicit timezone override", () => {
    expect(
      businessDateString(new Date("2026-08-03T02:00:00Z"), "America/New_York"),
    ).toBe("2026-08-02");
  });
});
