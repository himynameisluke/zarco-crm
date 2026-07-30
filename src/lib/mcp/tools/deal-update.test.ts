import { expect, test } from "vitest";
import { z } from "zod";
import { planDealUpdate, UPDATE_DEAL_INPUT } from "./deal-update";

// The bug this file exists to prevent: the Console agent called update_deal with
// { stage: "proposal" }. `stage` was not in the schema, zod's default object
// parsing silently STRIPPED it, and the handler updated nothing but updatedAt
// while returning the full row as a success. Three attempts in a row reported
// "moved to proposal" while the deal never left qualified.

test("the update_deal schema accepts stage instead of silently stripping it", () => {
  const parsed = z
    .object(UPDATE_DEAL_INPUT)
    .parse({ id: "2e1c8afc-ea47-464d-bb95-745be99981b1", stage: "proposal" });
  expect(parsed).toHaveProperty("stage", "proposal");
});

test("an empty patch is an explicit error, never a phantom success", () => {
  const plan = planDealUpdate({});
  expect(plan).toHaveProperty("error", "no_fields");
});

test("the no-fields error tells the model what it CAN send", () => {
  const plan = planDealUpdate({});
  if (!("error" in plan)) throw new Error("expected error plan");
  expect(plan.message).toContain("stage");
  expect(plan.message).toContain("valuePence");
  expect(plan.message).toContain("update_deal_stage");
});

test("a stage-only patch is a stage move, not a field update", () => {
  const plan = planDealUpdate({ stage: "proposal" });
  if ("error" in plan) throw new Error("expected update plan");
  expect(plan.stageMove).toBe("proposal");
  // Stage semantics (stageChangedAt, closeDate on won/lost, lostReason) are
  // applied by stageTransitionValues at the handler, not by this planner.
  expect(plan.values).not.toHaveProperty("stage");
  expect(plan.changedFields).toEqual([]);
});

test("plain field updates map into values and changedFields", () => {
  const plan = planDealUpdate({ name: "AI Consultancy", valuePence: 150_000 });
  if ("error" in plan) throw new Error("expected update plan");
  expect(plan.values).toMatchObject({ name: "AI Consultancy", valuePence: 150_000 });
  expect(plan.values.updatedAt).toBeInstanceOf(Date);
  expect(plan.changedFields.sort()).toEqual(["name", "valuePence"]);
  expect(plan.stageMove).toBeNull();
});

test("explicit nulls clear fields rather than being dropped", () => {
  const plan = planDealUpdate({ closeDate: null, organizationId: null });
  if ("error" in plan) throw new Error("expected update plan");
  expect(plan.values).toMatchObject({ closeDate: null, organizationId: null });
  expect(plan.changedFields.sort()).toEqual(["closeDate", "organizationId"]);
});

test("stage combined with field updates carries both", () => {
  const plan = planDealUpdate({ stage: "won", valuePence: 1_000_000 });
  if ("error" in plan) throw new Error("expected update plan");
  expect(plan.stageMove).toBe("won");
  expect(plan.values).toMatchObject({ valuePence: 1_000_000 });
  expect(plan.changedFields).toEqual(["valuePence"]);
});
