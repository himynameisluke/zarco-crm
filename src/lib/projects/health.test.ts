import { expect, test } from "vitest";
import { healthAdvisories, isHealthAdvisoryWorse } from "./health";

const NOW = new Date("2026-07-29T12:00:00Z");
const past = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const future = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

const baseProject = { health: "on_track" as const, status: "in_progress", endDate: null };

test("no advisories and on_track suggestion for a clean project", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
  expect(r.suggestedHealth).toBe("on_track");
});

test("overdue milestone (no completedAt) raises a warning", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [{ name: "UAT sign-off", dueDate: past(3), completedAt: null }],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toHaveLength(1);
  expect(r.advisories[0].severity).toBe("warning");
  expect(r.suggestedHealth).toBe("at_risk");
});

test("a completed milestone past its due date is NOT overdue", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [
      { name: "UAT sign-off", dueDate: past(3), completedAt: past(1) },
    ],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
});

test("a milestone due exactly 'today' (local-midnight boundary) is NOT overdue", () => {
  // Callers must anchor date-only dueDate/endDate to local midnight before
  // calling healthAdvisories (see the param docs on HealthMilestoneInput /
  // HealthProjectInput) — constructing both `now` and `dueDate` the same
  // way here locks the boundary regardless of which timezone tests run in:
  // a milestone due today, compared against "now" at that same local
  // midnight, must not be flagged overdue (strict `<`, not `<=`).
  const todayLocalMidnight = new Date(`2026-07-29T00:00:00`);
  const r = healthAdvisories({
    project: baseProject,
    milestones: [{ name: "Go-live", dueDate: todayLocalMidnight, completedAt: null }],
    risks: [],
    tasks: [],
    now: todayLocalMidnight,
  });
  expect(r.advisories).toEqual([]);
});

test("a milestone due in the future is not overdue", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [{ name: "Go-live", dueDate: future(5), completedAt: null }],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
});

test("open critical blocker raises critical and suggests off_track", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [
      { kind: "blocker", title: "DB down", severity: "critical", status: "open" },
    ],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories[0].severity).toBe("critical");
  expect(r.suggestedHealth).toBe("off_track");
});

test("open high risk raises warning only (not critical)", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [
      { kind: "risk", title: "Vendor delay", severity: "high", status: "open" },
    ],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories[0].severity).toBe("warning");
  expect(r.suggestedHealth).toBe("at_risk");
});

test("low/medium severity risks and resolved risks are ignored", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [
      { kind: "risk", title: "Minor", severity: "low", status: "open" },
      { kind: "risk", title: "Medium", severity: "medium", status: "open" },
      { kind: "blocker", title: "Fixed now", severity: "critical", status: "resolved" },
    ],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
  expect(r.suggestedHealth).toBe("on_track");
});

test("monitoring-status risks still count (only resolved is excluded)", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [
      { kind: "risk", title: "Watching", severity: "high", status: "monitoring" },
    ],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toHaveLength(1);
});

test("overdue urgent task raises critical", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [
      { title: "Ship hotfix", status: "todo", priority: "urgent", dueAt: past(1) },
    ],
    now: NOW,
  });
  expect(r.advisories[0].severity).toBe("critical");
  expect(r.suggestedHealth).toBe("off_track");
});

test("overdue high-priority task raises warning", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [
      { title: "Write spec", status: "in_progress", priority: "high", dueAt: past(1) },
    ],
    now: NOW,
  });
  expect(r.advisories[0].severity).toBe("warning");
});

test("overdue low/normal priority tasks are not advisory-worthy", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [
      { title: "Tidy notes", status: "todo", priority: "normal", dueAt: past(1) },
      { title: "Someday", status: "todo", priority: "low", dueAt: past(1) },
    ],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
});

test("done and cancelled tasks are never flagged even if urgent + overdue", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [
      { title: "Done already", status: "done", priority: "urgent", dueAt: past(5) },
      { title: "Called off", status: "cancelled", priority: "urgent", dueAt: past(5) },
    ],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
});

test("blocked tasks ARE still eligible for the overdue check", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [],
    risks: [],
    tasks: [
      { title: "Stuck", status: "blocked", priority: "urgent", dueAt: past(2) },
    ],
    now: NOW,
  });
  expect(r.advisories).toHaveLength(1);
});

test("past target end date raises critical, unless the project is completed", () => {
  const overdueProject = { ...baseProject, endDate: past(2) };
  const r = healthAdvisories({
    project: overdueProject,
    milestones: [],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories[0].severity).toBe("critical");

  const completedProject = { ...overdueProject, status: "completed" };
  const r2 = healthAdvisories({
    project: completedProject,
    milestones: [],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r2.advisories).toEqual([]);
});

test("a future end date is never an advisory", () => {
  const r = healthAdvisories({
    project: { ...baseProject, endDate: future(30) },
    milestones: [],
    risks: [],
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toEqual([]);
});

test("suggestedHealth takes the worst signal across every category", () => {
  const r = healthAdvisories({
    project: baseProject,
    milestones: [{ name: "M", dueDate: past(1), completedAt: null }], // warning
    risks: [{ kind: "blocker", title: "Down", severity: "critical", status: "open" }], // critical
    tasks: [],
    now: NOW,
  });
  expect(r.advisories).toHaveLength(2);
  expect(r.suggestedHealth).toBe("off_track");
});

test("isHealthAdvisoryWorse compares ordinal rank correctly", () => {
  expect(isHealthAdvisoryWorse("on_track", "at_risk")).toBe(true);
  expect(isHealthAdvisoryWorse("on_track", "off_track")).toBe(true);
  expect(isHealthAdvisoryWorse("at_risk", "off_track")).toBe(true);
  expect(isHealthAdvisoryWorse("off_track", "at_risk")).toBe(false);
  expect(isHealthAdvisoryWorse("at_risk", "at_risk")).toBe(false);
  expect(isHealthAdvisoryWorse("off_track", "on_track")).toBe(false);
});
