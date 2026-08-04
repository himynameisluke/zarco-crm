import { expect, test } from "vitest";
import { z } from "zod";
import { planTaskUpdate, UPDATE_TASK_INPUT } from "./task-update";

// Why this tool exists: the server shipped create_task, list_tasks and
// complete_task, so a task could be CLOSED but never reopened, rescheduled or
// re-prioritised. An EA asked for exactly this on 2026-08-05 ("no way to mark
// one done, change status, or reassign a due date").

const NOW = new Date("2026-08-05T09:00:00.000Z");
const OPEN = { status: "todo" as const };
const DONE = { status: "done" as const };

test("the schema accepts status alongside the plain columns", () => {
  const parsed = z
    .object(UPDATE_TASK_INPUT)
    .parse({ id: "2e1c8afc-ea47-464d-bb95-745be99981b1", status: "in_progress" });
  expect(parsed).toHaveProperty("status", "in_progress");
});

test("an empty patch is an explicit error, never a phantom success", () => {
  const plan = planTaskUpdate({}, OPEN, NOW);
  expect(plan).toHaveProperty("error", "no_fields");
});

test("the no-fields error tells the model what it CAN send", () => {
  const plan = planTaskUpdate({}, OPEN, NOW);
  if (!("error" in plan)) throw new Error("expected error plan");
  expect(plan.message).toContain("status");
  expect(plan.message).toContain("dueAt");
  expect(plan.message).toContain("priority");
});

test("closing a task stamps completedAt and reports the transition", () => {
  const plan = planTaskUpdate({ status: "done" }, OPEN, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.values.status).toBe("done");
  expect(plan.values.completedAt).toEqual(NOW);
  expect(plan.transition).toBe("completed");
});

test("reopening a done task CLEARS completedAt", () => {
  // The trap: complete_task only ever sets completedAt. A reopened task that
  // kept a stale stamp reads as finished to every downstream query.
  const plan = planTaskUpdate({ status: "todo" }, DONE, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.values.completedAt).toBeNull();
  expect(plan.transition).toBe("reopened");
});

test("cancelling a done task also clears the stamp", () => {
  const plan = planTaskUpdate({ status: "cancelled" }, DONE, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.values.completedAt).toBeNull();
  expect(plan.transition).toBe("reopened");
});

test("an open→open status move touches neither completedAt nor the transition", () => {
  const plan = planTaskUpdate({ status: "blocked" }, OPEN, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.values).not.toHaveProperty("completedAt");
  expect(plan.transition).toBeNull();
});

test("re-closing an already-done task does not re-stamp completedAt", () => {
  const plan = planTaskUpdate({ status: "done" }, DONE, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.values).not.toHaveProperty("completedAt");
  expect(plan.transition).toBeNull();
});

test("dueAt is parsed to a Date, and null CLEARS it", () => {
  const moved = planTaskUpdate({ dueAt: "2026-08-09T17:00:00.000Z" }, OPEN, NOW);
  if ("error" in moved) throw new Error("expected a plan");
  expect(moved.values.dueAt).toEqual(new Date("2026-08-09T17:00:00.000Z"));

  const cleared = planTaskUpdate({ dueAt: null }, OPEN, NOW);
  if ("error" in cleared) throw new Error("expected a plan");
  expect(cleared.values.dueAt).toBeNull();
  expect(cleared.changedFields).toContain("dueAt");
});

test("only the fields actually passed are written", () => {
  const plan = planTaskUpdate({ priority: "urgent" }, OPEN, NOW);
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.changedFields).toEqual(["priority"]);
  expect(plan.values).not.toHaveProperty("title");
  expect(plan.values).not.toHaveProperty("status");
  expect(plan.values.updatedAt).toEqual(NOW);
});

test("a mixed patch carries every changed field", () => {
  const plan = planTaskUpdate(
    { title: "Chase ITRIS on the API connector", status: "in_progress", priority: "high" },
    OPEN,
    NOW,
  );
  if ("error" in plan) throw new Error("expected a plan");
  expect(plan.changedFields.sort()).toEqual(["priority", "status", "title"]);
});

test("the schema rejects a status that isn't a real task status", () => {
  const parse = () =>
    z.object(UPDATE_TASK_INPUT).parse({
      id: "2e1c8afc-ea47-464d-bb95-745be99981b1",
      status: "finished",
    });
  expect(parse).toThrow();
});
