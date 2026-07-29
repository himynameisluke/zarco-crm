import { expect, test } from "vitest";
import { SEED_TEMPLATES, type SeedTemplate } from "./templates-seed";
import { expandTemplate } from "./template";

function phaseNames(t: SeedTemplate): Set<string> {
  return new Set(t.items.filter((i) => i.kind === "phase").map((i) => i.name));
}

test("there are exactly two seed templates: Console Implementation + Bespoke Build", () => {
  expect(SEED_TEMPLATES).toHaveLength(2);
  expect(SEED_TEMPLATES.map((t) => t.name).sort()).toEqual([
    "Bespoke Software Build",
    "Zarco Console Implementation",
  ]);
});

for (const template of SEED_TEMPLATES) {
  test(`${template.name}: has at least one phase, milestone, and task`, () => {
    const kinds = template.items.map((i) => i.kind);
    expect(kinds.filter((k) => k === "phase").length).toBeGreaterThan(0);
    expect(kinds.filter((k) => k === "milestone").length).toBeGreaterThan(0);
    expect(kinds.filter((k) => k === "task").length).toBeGreaterThan(0);
  });

  test(`${template.name}: every milestone/task phaseName matches a real phase name`, () => {
    const names = phaseNames(template);
    for (const item of template.items) {
      if (item.kind === "phase") continue;
      expect(item.phaseName, `"${item.name}" references an unknown phase`).not.toBeNull();
      expect(names.has(item.phaseName as string)).toBe(true);
    }
  });

  test(`${template.name}: phase names are unique`, () => {
    const names = template.items
      .filter((i) => i.kind === "phase")
      .map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test(`${template.name}: phase sortOrder is a contiguous 0..n-1 sequence`, () => {
    const orders = template.items
      .filter((i) => i.kind === "phase")
      .map((i) => i.sortOrder)
      .sort((a, b) => a - b);
    expect(orders).toEqual(orders.map((_, i) => i));
  });

  test(`${template.name}: expands cleanly through expandTemplate with no errors`, () => {
    const startDate = new Date("2026-08-01T00:00:00Z");
    const result = expandTemplate(
      { id: "seed", name: template.name },
      template.items,
      { startDate },
    );
    expect(result.phases.length).toBe(
      template.items.filter((i) => i.kind === "phase").length,
    );
    expect(result.milestones.length).toBe(
      template.items.filter((i) => i.kind === "milestone").length,
    );
    expect(result.tasks.length).toBe(
      template.items.filter((i) => i.kind === "task").length,
    );
    // Every resolved milestone/task date should be on or after the start
    // date — a template shouldn't schedule work before the project starts.
    for (const m of result.milestones) {
      expect(m.dueDate && m.dueDate >= startDate).toBe(true);
    }
    for (const t of result.tasks) {
      expect(t.dueAt && t.dueAt >= startDate).toBe(true);
    }
  });
}
