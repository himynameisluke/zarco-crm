import { expect, test } from "vitest";
import { bucketLostReason, bucketLostReasons } from "./lost-reason";

test("classifies price-related reasons", () => {
  expect(bucketLostReason("Went with a competitor on price")).toBe("Competitor");
  expect(bucketLostReason("too expensive for their budget")).toBe("Price");
});

test("classifies timing / in-house / no-decision", () => {
  expect(bucketLostReason("bad timing, revisit next year")).toBe("Timing");
  expect(bucketLostReason("decided to build it in-house")).toBe("Went in-house");
  expect(bucketLostReason("went quiet, no decision made")).toBe("No decision");
});

test("null/empty reason becomes Not recorded", () => {
  expect(bucketLostReason(null)).toBe("Not recorded");
  expect(bucketLostReason("   ")).toBe("Not recorded");
});

test("unrecognised text falls to Other", () => {
  expect(bucketLostReason("random gibberish")).toBe("Other");
});

test("bucketLostReasons aggregates + sorts by count desc", () => {
  const result = bucketLostReasons([
    "too expensive",
    "price was too high",
    "went in-house",
    null,
  ]);
  expect(result[0]).toEqual({ label: "Price", count: 2 });
  expect(result).toContainEqual({ label: "Went in-house", count: 1 });
  expect(result).toContainEqual({ label: "Not recorded", count: 1 });
});
