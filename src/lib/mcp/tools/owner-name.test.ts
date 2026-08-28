import { expect, test } from "vitest";
import { withOwnerName } from "./owner-name";

// The gap this file exists to prevent: org and deal list payloads carried NO owner
// field at all, so every read-side consumer (the Console's deterministic book sync
// found this live, 2026-08-28) treated "no owner" as a fact about the account when
// it was a fact about the read. Rows must carry ownerName — and never the raw email.

test("an owned row swaps ownerEmail for the derived ownerName", () => {
  const row = withOwnerName({ id: "org_1", ownerEmail: "dana.cole@helix.example" });
  expect(row).toHaveProperty("ownerName");
  expect(row.ownerName).toBeTruthy();
  expect(row).not.toHaveProperty("ownerEmail");
});

test("an unowned row carries ownerName: null, never a missing key", () => {
  const row = withOwnerName({ id: "org_1", ownerEmail: null });
  expect(row.ownerName).toBeNull();
  expect(Object.prototype.hasOwnProperty.call(row, "ownerName")).toBe(true);
  expect(row).not.toHaveProperty("ownerEmail");
});

test("every other field passes through untouched", () => {
  const row = withOwnerName({
    id: "org_1", name: "Acme", industry: null, ownerEmail: "sam@x.example",
  });
  expect(row.id).toBe("org_1");
  expect(row.name).toBe("Acme");
  expect(row.industry).toBeNull();
});
