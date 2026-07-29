import { expect, test } from "vitest";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  OPEN_TASK_STATUSES,
  isOpenTaskStatus,
  type TaskStatusValue,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_HEALTHS,
  PROJECT_HEALTH_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  PROJECT_RISK_KINDS,
  PROJECT_RISK_KIND_LABELS,
  PROJECT_RISK_SEVERITIES,
  PROJECT_RISK_SEVERITY_LABELS,
  PROJECT_RISK_LIKELIHOODS,
  PROJECT_RISK_LIKELIHOOD_LABELS,
  PROJECT_RISK_STATUSES,
  PROJECT_RISK_STATUS_LABELS,
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

// Exhaustiveness checks for every project-management label map — same
// doctrine as the task-status check above: a new enum value without a
// matching label must fail loudly here, not render a raw string in the UI.
test("every project status has a label, and only those statuses", () => {
  for (const s of PROJECT_STATUSES) expect(PROJECT_STATUS_LABELS[s]).toBeTruthy();
  expect(Object.keys(PROJECT_STATUS_LABELS).sort()).toEqual([...PROJECT_STATUSES].sort());
});

test("every project health has a label, and only those healths", () => {
  for (const h of PROJECT_HEALTHS) expect(PROJECT_HEALTH_LABELS[h]).toBeTruthy();
  expect(Object.keys(PROJECT_HEALTH_LABELS).sort()).toEqual([...PROJECT_HEALTHS].sort());
});

test("every project type has a label, and only those types", () => {
  for (const t of PROJECT_TYPES) expect(PROJECT_TYPE_LABELS[t]).toBeTruthy();
  expect(Object.keys(PROJECT_TYPE_LABELS).sort()).toEqual([...PROJECT_TYPES].sort());
});

test("every risk kind/severity/likelihood/status has a label, and only those", () => {
  for (const k of PROJECT_RISK_KINDS) expect(PROJECT_RISK_KIND_LABELS[k]).toBeTruthy();
  expect(Object.keys(PROJECT_RISK_KIND_LABELS).sort()).toEqual([...PROJECT_RISK_KINDS].sort());

  for (const s of PROJECT_RISK_SEVERITIES) expect(PROJECT_RISK_SEVERITY_LABELS[s]).toBeTruthy();
  expect(Object.keys(PROJECT_RISK_SEVERITY_LABELS).sort()).toEqual(
    [...PROJECT_RISK_SEVERITIES].sort(),
  );

  for (const l of PROJECT_RISK_LIKELIHOODS) expect(PROJECT_RISK_LIKELIHOOD_LABELS[l]).toBeTruthy();
  expect(Object.keys(PROJECT_RISK_LIKELIHOOD_LABELS).sort()).toEqual(
    [...PROJECT_RISK_LIKELIHOODS].sort(),
  );

  for (const st of PROJECT_RISK_STATUSES) expect(PROJECT_RISK_STATUS_LABELS[st]).toBeTruthy();
  expect(Object.keys(PROJECT_RISK_STATUS_LABELS).sort()).toEqual(
    [...PROJECT_RISK_STATUSES].sort(),
  );
});
