import { expect, test } from "vitest";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  OPEN_TASK_STATUSES,
  isOpenTaskStatus,
  type TaskStatusValue,
} from "./labels";

// Exhaustiveness: every status/priority the DB enum can hold must have a
// label, and the label map must not carry any stale/extra keys either. If
// schema.ts ever adds a new task_status or task_priority value without a
// matching label, this test fails loudly instead of the UI silently
// rendering the raw enum string somewhere.
test("every task status has a label, and only those statuses", () => {
  for (const status of TASK_STATUSES) {
    expect(TASK_STATUS_LABELS[status]).toBeTruthy();
    expect(typeof TASK_STATUS_LABELS[status]).toBe("string");
  }
  expect(Object.keys(TASK_STATUS_LABELS).sort()).toEqual(
    [...TASK_STATUSES].sort(),
  );
});

test("the new statuses (blocked, cancelled) are present with distinct labels", () => {
  expect(TASK_STATUS_LABELS.blocked).toBe("Blocked");
  expect(TASK_STATUS_LABELS.cancelled).toBe("Cancelled");
  const labels = Object.values(TASK_STATUS_LABELS);
  expect(new Set(labels).size).toBe(labels.length);
});

test("every task priority has a label, and only those priorities", () => {
  for (const priority of TASK_PRIORITIES) {
    expect(TASK_PRIORITY_LABELS[priority]).toBeTruthy();
  }
  expect(Object.keys(TASK_PRIORITY_LABELS).sort()).toEqual(
    [...TASK_PRIORITIES].sort(),
  );
});

test("open statuses are everything except done and cancelled", () => {
  expect(OPEN_TASK_STATUSES).toEqual(["todo", "in_progress", "blocked"]);
  expect(OPEN_TASK_STATUSES).not.toContain("done");
  expect(OPEN_TASK_STATUSES).not.toContain("cancelled");
});

test("isOpenTaskStatus agrees with OPEN_TASK_STATUSES for all five statuses", () => {
  for (const status of TASK_STATUSES) {
    const expected = (OPEN_TASK_STATUSES as readonly TaskStatusValue[]).includes(
      status,
    );
    expect(isOpenTaskStatus(status)).toBe(expected);
  }
});
