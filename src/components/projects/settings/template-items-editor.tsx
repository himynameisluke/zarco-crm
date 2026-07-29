"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { saveProjectTemplateItems } from "@/app/(app)/settings/projects/actions";
import { useActionForm } from "@/lib/use-action-form";
import { PROJECT_TEMPLATE_ITEM_KINDS, type ProjectTemplateItemKindValue } from "@/lib/projects/labels";

type Row = {
  key: string;
  kind: ProjectTemplateItemKindValue;
  name: string;
  description: string;
  phaseName: string;
  offsetDays: string;
};

type InitialItem = {
  kind: string;
  name: string;
  description: string | null;
  phaseName: string | null;
  offsetDays: number | null;
};

const KIND_LABELS: Record<ProjectTemplateItemKindValue, string> = {
  phase: "Phase",
  milestone: "Milestone",
  task: "Task",
};

function newKey() {
  return Math.random().toString(36).slice(2);
}

function toRows(items: InitialItem[]): Row[] {
  return items.map((item) => ({
    key: newKey(),
    kind: item.kind as ProjectTemplateItemKindValue,
    name: item.name,
    description: item.description ?? "",
    phaseName: item.phaseName ?? "",
    offsetDays: item.offsetDays != null ? String(item.offsetDays) : "",
  }));
}

/**
 * Wholesale item editor for a template — add/remove/reorder phase,
 * milestone, and task rows, save replaces the entire set at once via
 * saveProjectTemplateItems (same pattern as the quote line-items editor).
 * sortOrder is recomputed on save as each row's position within its own
 * kind bucket, matching how the seed templates (templates-seed.ts) and
 * queries.ts's kind-then-sortOrder ordering expect it.
 */
export function TemplateItemsEditor({
  templateId,
  initialItems,
}: {
  templateId: string;
  initialItems: InitialItem[];
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialItems));
  const boundAction = saveProjectTemplateItems.bind(null, templateId);
  const { state, pending, onSubmit } = useActionForm(boundAction);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newKey(), kind: "task", name: "", description: "", phaseName: "", offsetDays: "" },
    ]);
  }

  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const payload = (() => {
    const counters: Record<ProjectTemplateItemKindValue, number> = { phase: 0, milestone: 0, task: 0 };
    return rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => {
        const sortOrder = counters[r.kind]++;
        return {
          kind: r.kind,
          name: r.name.trim(),
          description: r.description.trim() || undefined,
          phaseName: r.kind === "phase" ? undefined : r.phaseName.trim() || undefined,
          offsetDays: r.kind === "phase" || r.offsetDays === "" ? undefined : Number(r.offsetDays),
          sortOrder,
        };
      });
  })();

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="items" value={JSON.stringify(payload)} />

      <div style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Kind</th>
              <th style={{ width: 220 }}>Name</th>
              <th>Description</th>
              <th style={{ width: 160 }}>Phase</th>
              <th style={{ width: 100 }}>Offset (days)</th>
              <th style={{ width: 96 }} aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key}>
                <td style={{ padding: 4 }}>
                  <select
                    className="input"
                    style={{ height: 30, paddingLeft: 8, paddingRight: 8 }}
                    value={row.kind}
                    onChange={(e) =>
                      updateRow(row.key, { kind: e.target.value as ProjectTemplateItemKindValue })
                    }
                  >
                    {PROJECT_TEMPLATE_ITEM_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 4 }}>
                  <input
                    className="input"
                    style={{ height: 30 }}
                    value={row.name}
                    onChange={(e) => updateRow(row.key, { name: e.target.value })}
                    placeholder="Name"
                  />
                </td>
                <td style={{ padding: 4 }}>
                  <input
                    className="input"
                    style={{ height: 30 }}
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    placeholder="Optional"
                  />
                </td>
                <td style={{ padding: 4 }}>
                  <input
                    className="input"
                    style={{ height: 30 }}
                    value={row.phaseName}
                    onChange={(e) => updateRow(row.key, { phaseName: e.target.value })}
                    placeholder={row.kind === "phase" ? "—" : "Which phase"}
                    disabled={row.kind === "phase"}
                  />
                </td>
                <td style={{ padding: 4 }}>
                  <input
                    className="input"
                    style={{ height: 30, textAlign: "right" }}
                    type="number"
                    min={0}
                    value={row.offsetDays}
                    onChange={(e) => updateRow(row.key, { offsetDays: e.target.value })}
                    placeholder="—"
                    disabled={row.kind === "phase"}
                  />
                </td>
                <td style={{ padding: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="btn-ghost"
                      style={{ padding: 4, border: 0, background: "transparent", color: "var(--ink-4)", opacity: i === 0 ? 0.35 : 1 }}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      aria-label="Move down"
                      className="btn-ghost"
                      style={{ padding: 4, border: 0, background: "transparent", color: "var(--ink-4)", opacity: i === rows.length - 1 ? 0.35 : 1 }}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove row"
                      className="btn-ghost"
                      style={{ padding: 4, border: 0, background: "transparent", color: "var(--danger)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px 8px", color: "var(--ink-4)", fontSize: 12.5 }}>
                  No items yet — add phases, milestones, and tasks below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 4px 0",
        }}
      >
        <button type="button" onClick={addRow} className="btn" style={{ height: 30 }}>
          <Plus size={13} />
          Add row
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {state?.error ? (
            <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{state.error}</span>
          ) : null}
          <button type="submit" className="btn btn-primary" style={{ height: 30 }} disabled={pending}>
            {pending ? "Saving…" : "Save items"}
          </button>
        </div>
      </div>
    </form>
  );
}
