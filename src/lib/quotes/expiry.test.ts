import { describe, expect, it } from "vitest";

import { isExpired } from "./expiry";

const AUG_3 = new Date("2026-08-03T12:00:00Z");

describe("isExpired", () => {
  it("is false with no validUntil", () => {
    expect(isExpired(null, AUG_3)).toBe(false);
  });

  it("is true the day after validUntil", () => {
    expect(isExpired("2026-08-02", AUG_3)).toBe(true);
  });

  it("is false ON the validUntil date (valid through the day)", () => {
    expect(isExpired("2026-08-03", AUG_3)).toBe(false);
  });

  it("is false before the validUntil date", () => {
    expect(isExpired("2026-12-31", AUG_3)).toBe(false);
  });
});
