import { expect, test } from "vitest";
import {
  boardColumns,
  columnForProject,
  moveProject,
  UNPHASED_COLUMN,
  COMPLETE_COLUMN,
} from "./board";

const NOW = new Date("2026-07-29T12:00:00Z");
const DEFAULT_PHASES = ["Discovery", "Build", "Go-Live"];

test("boardColumns puts Unphased first and Complete last", () => {
  const cols = boardColumns(DEFAULT_PHASES);
  expect(cols.map((c) => c.key)).toEqual([
    UNPHASED_COLUMN,
    "Discovery",
    "Build",
    "Go-Live",
    COMPLETE_COLUMN,
  ]);
});

test("boardColumns handles an empty default phase list", () => {
  const cols = boardColumns([]);
  expect(cols.map((c) => c.key)).toEqual([UNPHASED_COLUMN, COMPLETE_COLUMN]);
});

test("columnForProject: completed status always lands in Complete regardless of phase", () => {
  const map = new Map([["p1", "Build"]]);
  expect(
    columnForProject({ currentPhaseId: "p1", status: "completed" }, map),
  ).toBe(COMPLETE_COLUMN);
});

test("columnForProject: no currentPhaseId lands in Unphased", () => {
  const map = new Map<string, string>();
  expect(
    columnForProject({ currentPhaseId: null, status: "in_progress" }, map),
  ).toBe(UNPHASED_COLUMN);
});

test("columnForProject: currentPhaseId resolves through the id->name map", () => {
  const map = new Map([["phase-1", "Build"]]);
  expect(
    columnForProject({ currentPhaseId: "phase-1", status: "in_progress" }, map),
  ).toBe("Build");
});

test("columnForProject: a stale/unknown phase id falls back to Unphased", () => {
  const map = new Map<string, string>();
  expect(
    columnForProject({ currentPhaseId: "deleted-phase", status: "in_progress" }, map),
  ).toBe(UNPHASED_COLUMN);
});

test("moveProject to an existing phase sets currentPhaseId, no appendPhase", () => {
  const phases = [
    { id: "ph-1", name: "Discovery", sortOrder: 0 },
    { id: "ph-2", name: "Build", sortOrder: 1 },
  ];
  const plan = moveProject({ status: "in_progress" }, "Build", phases, NOW);
  expect(plan).toEqual({
    currentPhaseId: "ph-2",
    appendPhase: null,
    statusChange: null,
  });
});

test("moveProject to a phase the project doesn't have appends it", () => {
  const phases = [{ id: "ph-1", name: "Discovery", sortOrder: 0 }];
  const plan = moveProject({ status: "in_progress" }, "Go-Live", phases, NOW);
  expect(plan.currentPhaseId).toBeNull();
  expect(plan.appendPhase).toEqual({ name: "Go-Live", sortOrder: 1 });
  expect(plan.statusChange).toBeNull();
});

test("appendPhase sortOrder continues from however many phases already exist", () => {
  const phases = [
    { id: "ph-1", name: "Discovery", sortOrder: 0 },
    { id: "ph-2", name: "Build", sortOrder: 1 },
    { id: "ph-3", name: "Testing", sortOrder: 2 },
  ];
  const plan = moveProject({ status: "in_progress" }, "Go-Live", phases, NOW);
  expect(plan.appendPhase).toEqual({ name: "Go-Live", sortOrder: 3 });
});

test("moveProject to Unphased clears currentPhaseId", () => {
  const phases = [{ id: "ph-1", name: "Discovery", sortOrder: 0 }];
  const plan = moveProject(
    { status: "in_progress" },
    UNPHASED_COLUMN,
    phases,
    NOW,
  );
  expect(plan.currentPhaseId).toBeNull();
  expect(plan.appendPhase).toBeNull();
  expect(plan.statusChange).toBeNull();
});

test("moveProject to Complete stamps status + completedAt using the injected clock", () => {
  const plan = moveProject({ status: "in_progress" }, COMPLETE_COLUMN, [], NOW);
  expect(plan.statusChange).toEqual({ status: "completed", completedAt: NOW });
  expect(plan.currentPhaseId).toBeNull();
});

test("moving an already-completed project to Complete again is a no-op status change", () => {
  const plan = moveProject({ status: "completed" }, COMPLETE_COLUMN, [], NOW);
  expect(plan.statusChange).toBeNull();
});

test("moving a completed project back to a phase un-completes it and clears completedAt", () => {
  const phases = [{ id: "ph-1", name: "Discovery", sortOrder: 0 }];
  const plan = moveProject({ status: "completed" }, "Discovery", phases, NOW);
  expect(plan.statusChange).toEqual({ status: "in_progress", completedAt: null });
  expect(plan.currentPhaseId).toBe("ph-1");
});

test("moving a completed project to Unphased also un-completes it", () => {
  const plan = moveProject(
    { status: "completed" },
    UNPHASED_COLUMN,
    [],
    NOW,
  );
  expect(plan.statusChange).toEqual({ status: "in_progress", completedAt: null });
});

test("moving a non-completed project between two real phases never touches status", () => {
  const phases = [
    { id: "ph-1", name: "Discovery", sortOrder: 0 },
    { id: "ph-2", name: "Build", sortOrder: 1 },
  ];
  const plan = moveProject({ status: "on_hold" }, "Build", phases, NOW);
  expect(plan.statusChange).toBeNull();
});
