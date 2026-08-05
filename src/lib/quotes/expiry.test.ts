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

  it("uses the UK-local day, not UTC — expired at 00:30 BST the day after", () => {
    // 23:30 UTC on the 2nd = 00:30 BST on the 3rd; a quote valid until the
    // 2nd has expired from the business's point of view.
    const halfPastMidnightBst = new Date("2026-08-02T23:30:00Z");
    expect(isExpired("2026-08-02", halfPastMidnightBst)).toBe(true);
    expect(isExpired("2026-08-03", halfPastMidnightBst)).toBe(false);
  });
});
