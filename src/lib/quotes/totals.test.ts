import { describe, expect, it } from "vitest";

import {
  computeTotalsPence,
  lineTotalPence,
  totalWithTaxPence,
} from "./totals";

describe("lineTotalPence", () => {
  it("rounds fractional quantities per line", () => {
    expect(lineTotalPence({ quantity: 2.5, unitPricePence: 333 })).toBe(833);
    expect(lineTotalPence({ quantity: 3, unitPricePence: 10000 })).toBe(30000);
  });

  it("handles zero quantity", () => {
    expect(lineTotalPence({ quantity: 0, unitPricePence: 500 })).toBe(0);
  });
});

describe("computeTotalsPence", () => {
  it("sums rounded line totals and rounds tax once on the subtotal", () => {
    const { subtotalPence, totalPence } = computeTotalsPence(
      [
        { quantity: 2.5, unitPricePence: 333 },
        { quantity: 3, unitPricePence: 10000 },
      ],
      0.2,
    );
    expect(subtotalPence).toBe(30833);
    // 30833 * 1.2 = 36999.6 → 37000
    expect(totalPence).toBe(37000);
  });

  it("applies zero tax as identity", () => {
    const { subtotalPence, totalPence } = computeTotalsPence(
      [{ quantity: 1, unitPricePence: 999 }],
      0,
    );
    expect(subtotalPence).toBe(999);
    expect(totalPence).toBe(999);
  });
});

describe("totalWithTaxPence", () => {
  it("recomputes the total from a stored subtotal when only the tax rate changes", () => {
    // The update_quote taxRate-only path: subtotal is untouched, total must
    // follow the new rate — this is the invariant that regressed.
    expect(totalWithTaxPence(30833, 0.1)).toBe(33916);
    expect(totalWithTaxPence(30833, 0.2)).toBe(37000);
    expect(totalWithTaxPence(30833, 0)).toBe(30833);
  });

  it("matches computeTotalsPence for the same items and rate", () => {
    const items = [
      { quantity: 1.25, unitPricePence: 1234 },
      { quantity: 7, unitPricePence: 89 },
    ];
    const viaItems = computeTotalsPence(items, 0.2);
    expect(totalWithTaxPence(viaItems.subtotalPence, 0.2)).toBe(
      viaItems.totalPence,
    );
  });
});
