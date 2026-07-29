// Template expansion — pure core, no db import. Turns a template's flat
// item list (project_template_items) into the concrete phases/milestones/
// tasks a new project starts with. Dates resolve from the project's start
// date + each item's offsetDays. Phase assignment for milestones/tasks is
// by NAME match against the template's own phase items (phases don't have
// real row ids yet at expansion time — the io-shell resolves phaseName to
// a phaseId only after inserting the phase rows, inside its transaction).

export type TemplateItemKind = "phase" | "milestone" | "task";

export type TemplateItemInput = {
  kind: TemplateItemKind;
  name: string;
  description: string | null;
  phaseName: string | null;
  offsetDays: number | null;
  sortOrder: number;
};

export type TemplateInput = {
  id: string;
  name: string;
};

export type ExpandedPhase = {
  name: string;
  sortOrder: number;
};

export type ExpandedMilestone = {
  name: string;
  description: string | null;
  dueDate: Date | null;
  /** Matched against ExpandedPhase.name by the io-shell after phase insert. */
  phaseName: string | null;
  sortOrder: number;
};

export type ExpandedTask = {
  title: string;
  description: string | null;
  dueAt: Date | null;
  phaseName: string | null;
  sortOrder: number;
};

export type ExpandedTemplate = {
  phases: ExpandedPhase[];
  milestones: ExpandedMilestone[];
  tasks: ExpandedTask[];
};

export type ExpandTemplateOptions = {
  startDate: Date;
};

function resolveDate(startDate: Date, offsetDays: number | null): Date | null {
  if (offsetDays == null) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// Array.prototype.sort is a stable sort in every JS engine we run on
// (spec-guaranteed since ES2019) — ties keep their original relative order,
// which matters since template items sharing a sortOrder should still come
// out in authoring order.
function byOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * `template` is accepted (not just `items`) so callers can pass the whole
 * row without destructuring — it isn't consulted by the expansion logic
 * itself today, which only needs offsetDays/phaseName off each item.
 */
export function expandTemplate(
  _template: TemplateInput,
  items: TemplateItemInput[],
  { startDate }: ExpandTemplateOptions,
): ExpandedTemplate {
  const phaseItems = byOrder(items.filter((i) => i.kind === "phase"));
  const milestoneItems = byOrder(items.filter((i) => i.kind === "milestone"));
  const taskItems = byOrder(items.filter((i) => i.kind === "task"));

  const phases: ExpandedPhase[] = phaseItems.map((p) => ({
    name: p.name,
    sortOrder: p.sortOrder,
  }));

  const milestones: ExpandedMilestone[] = milestoneItems.map((m) => ({
    name: m.name,
    description: m.description,
    dueDate: resolveDate(startDate, m.offsetDays),
    phaseName: m.phaseName,
    sortOrder: m.sortOrder,
  }));

  const tasks: ExpandedTask[] = taskItems.map((t) => ({
    title: t.name,
    description: t.description,
    dueAt: resolveDate(startDate, t.offsetDays),
    phaseName: t.phaseName,
    sortOrder: t.sortOrder,
  }));

  return { phases, milestones, tasks };
}
