import { expect, test } from "vitest";
import { expandTemplate, type TemplateItemInput } from "./template";

const TEMPLATE = { id: "t1", name: "Test Template" };
const START = new Date("2026-08-03T00:00:00Z");

function item(overrides: Partial<TemplateItemInput>): TemplateItemInput {
  return {
    kind: "task",
    name: "item",
    description: null,
    phaseName: null,
    offsetDays: null,
    sortOrder: 0,
    ...overrides,
  };
}

test("empty item list expands to empty phases/milestones/tasks", () => {
  const r = expandTemplate(TEMPLATE, [], { startDate: START });
  expect(r).toEqual({ phases: [], milestones: [], tasks: [] });
});

test("phases carry through name + sortOrder, sorted", () => {
  const items = [
    item({ kind: "phase", name: "Build", sortOrder: 2 }),
    item({ kind: "phase", name: "Discovery", sortOrder: 0 }),
    item({ kind: "phase", name: "Design", sortOrder: 1 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.phases.map((p) => p.name)).toEqual(["Discovery", "Design", "Build"]);
});

test("milestone due date resolves from startDate + offsetDays", () => {
  const items = [
    item({ kind: "milestone", name: "Kickoff", offsetDays: 5, sortOrder: 0 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.milestones[0].dueDate).toEqual(new Date("2026-08-08T00:00:00Z"));
});

test("a null offsetDays resolves to a null due date, not startDate itself", () => {
  const items = [
    item({ kind: "milestone", name: "No date", offsetDays: null, sortOrder: 0 }),
    item({ kind: "task", name: "No due", offsetDays: null, sortOrder: 0 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.milestones[0].dueDate).toBeNull();
  expect(r.tasks[0].dueAt).toBeNull();
});

test("offsetDays of 0 resolves to exactly the start date (not treated as null)", () => {
  const items = [
    item({ kind: "task", name: "Day one", offsetDays: 0, sortOrder: 0 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.tasks[0].dueAt).toEqual(START);
});

test("negative offsetDays resolve to a date before the start date", () => {
  const items = [
    item({ kind: "task", name: "Prep", offsetDays: -2, sortOrder: 0 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.tasks[0].dueAt).toEqual(new Date("2026-08-01T00:00:00Z"));
});

test("tasks map name -> title and keep phaseName for later resolution", () => {
  const items = [
    item({
      kind: "task",
      name: "Audit CRM data",
      description: "Check dedupe + field mapping",
      phaseName: "Discovery",
      offsetDays: 3,
      sortOrder: 1,
    }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.tasks[0]).toEqual({
    title: "Audit CRM data",
    description: "Check dedupe + field mapping",
    dueAt: new Date("2026-08-06T00:00:00Z"),
    phaseName: "Discovery",
    sortOrder: 1,
  });
});

test("kinds are partitioned independently — sortOrder ties within a kind are stable", () => {
  const items = [
    item({ kind: "task", name: "Task A", sortOrder: 0 }),
    item({ kind: "milestone", name: "Milestone A", sortOrder: 0 }),
    item({ kind: "task", name: "Task B", sortOrder: 0 }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.tasks.map((t) => t.title)).toEqual(["Task A", "Task B"]);
  expect(r.milestones.map((m) => m.name)).toEqual(["Milestone A"]);
});

test("a realistic mixed template expands all three kinds correctly", () => {
  const items: TemplateItemInput[] = [
    item({ kind: "phase", name: "Discovery", sortOrder: 0 }),
    item({ kind: "phase", name: "Build", sortOrder: 1 }),
    item({
      kind: "milestone",
      name: "Discovery complete",
      phaseName: "Discovery",
      offsetDays: 7,
      sortOrder: 0,
    }),
    item({
      kind: "task",
      name: "Stakeholder interviews",
      phaseName: "Discovery",
      offsetDays: 2,
      sortOrder: 0,
    }),
    item({
      kind: "task",
      name: "Environment setup",
      phaseName: "Build",
      offsetDays: 10,
      sortOrder: 1,
    }),
  ];
  const r = expandTemplate(TEMPLATE, items, { startDate: START });
  expect(r.phases).toHaveLength(2);
  expect(r.milestones).toHaveLength(1);
  expect(r.tasks).toHaveLength(2);
  expect(r.milestones[0].phaseName).toBe("Discovery");
  expect(r.tasks[1].phaseName).toBe("Build");
});
