import { expect, test } from "vitest";
import { computeProjectMetrics } from "./metrics";

const NOW = new Date("2026-07-29T12:00:00Z");
const past = (days: number) => new Date(NOW.getTime() - days * 86400000);
const future = (days: number) => new Date(NOW.getTime() + days * 86400000);

test("all zero on an empty workspace", () => {
  const m = computeProjectMetrics([], [], [], NOW);
  expect(m).toEqual({
    active: 0,
    atRisk: 0,
    blocked: 0,
    overdueTasks: 0,
    dueThisWeek: 0,
    avgProgress: null,
    completedThisMonth: 0,
  });
});

test("active counts only in_progress projects", () => {
  const projects = [
    { status: "in_progress", health: "on_track" as const, progress: 50, completedAt: null },
    { status: "not_started", health: "on_track" as const, progress: null, completedAt: null },
    { status: "on_hold", health: "on_track" as const, progress: 20, completedAt: null },
    { status: "completed", health: "on_track" as const, progress: 100, completedAt: NOW },
  ];
  const m = computeProjectMetrics(projects, [], [], NOW);
  expect(m.active).toBe(1);
});

test("atRisk buckets both at_risk and off_track health", () => {
  const projects = [
    { status: "in_progress", health: "at_risk" as const, progress: 30, completedAt: null },
    { status: "in_progress", health: "off_track" as const, progress: 10, completedAt: null },
    { status: "in_progress", health: "on_track" as const, progress: 80, completedAt: null },
  ];
  const m = computeProjectMetrics(projects, [], [], NOW);
  expect(m.atRisk).toBe(2);
});

test("blocked counts only open/monitoring blockers, not risks or resolved blockers", () => {
  const risks = [
    { kind: "blocker" as const, status: "open" as const },
    { kind: "blocker" as const, status: "monitoring" as const },
    { kind: "blocker" as const, status: "resolved" as const },
    { kind: "risk" as const, status: "open" as const },
  ];
  const m = computeProjectMetrics([], [], risks, NOW);
  expect(m.blocked).toBe(2);
});

test("overdueTasks and dueThisWeek partition correctly, excluding done/cancelled", () => {
  const tasks = [
    { status: "todo" as const, dueAt: past(1) }, // overdue
    { status: "blocked" as const, dueAt: past(5) }, // overdue
    { status: "in_progress" as const, dueAt: future(3) }, // due this week
    { status: "todo" as const, dueAt: future(6) }, // due this week (boundary-ish)
    { status: "todo" as const, dueAt: future(30) }, // later, not counted
    { status: "done" as const, dueAt: past(1) }, // ignored — done
    { status: "cancelled" as const, dueAt: past(1) }, // ignored — cancelled
    { status: "todo" as const, dueAt: null }, // no due date, ignored
  ];
  const m = computeProjectMetrics([], tasks, [], NOW);
  expect(m.overdueTasks).toBe(2);
  expect(m.dueThisWeek).toBe(2);
});

test("a task due exactly 7 days out counts as due this week (inclusive boundary)", () => {
  const sevenDaysOut = new Date(NOW.getTime() + 7 * 86400000);
  const m = computeProjectMetrics(
    [],
    [{ status: "todo", dueAt: sevenDaysOut }],
    [],
    NOW,
  );
  expect(m.dueThisWeek).toBe(1);
});

test("avgProgress ignores projects with null progress and rounds the mean", () => {
  const projects = [
    { status: "in_progress", health: "on_track" as const, progress: 30, completedAt: null },
    { status: "in_progress", health: "on_track" as const, progress: 45, completedAt: null },
    { status: "not_started", health: "on_track" as const, progress: null, completedAt: null },
  ];
  const m = computeProjectMetrics(projects, [], [], NOW);
  // (30 + 45) / 2 = 37.5 -> rounds to 38
  expect(m.avgProgress).toBe(38);
});

test("avgProgress is null when every project has null progress", () => {
  const projects = [
    { status: "not_started", health: "on_track" as const, progress: null, completedAt: null },
  ];
  const m = computeProjectMetrics(projects, [], [], NOW);
  expect(m.avgProgress).toBeNull();
});

test("completedThisMonth only counts completedAt within the current calendar month", () => {
  const thisMonthDate = new Date(Date.UTC(2026, 6, 5)); // July 2026
  const lastMonthDate = new Date(Date.UTC(2026, 5, 28)); // June 2026
  const nextYearSameMonthLastYear = new Date(Date.UTC(2025, 6, 5)); // July 2025
  const projects = [
    { status: "completed", health: "on_track" as const, progress: 100, completedAt: thisMonthDate },
    { status: "completed", health: "on_track" as const, progress: 100, completedAt: lastMonthDate },
    { status: "completed", health: "on_track" as const, progress: 100, completedAt: nextYearSameMonthLastYear },
    { status: "in_progress", health: "on_track" as const, progress: 50, completedAt: null },
  ];
  const m = computeProjectMetrics(projects, [], [], NOW);
  expect(m.completedThisMonth).toBe(1);
});
