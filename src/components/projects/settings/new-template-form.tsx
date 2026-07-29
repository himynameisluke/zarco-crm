"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createProjectTemplate } from "@/app/(app)/settings/projects/actions";
import { useActionForm } from "@/lib/use-action-form";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/lib/projects/labels";

/**
 * Inline "new template" composer on the templates list. Collapsed to a
 * single button until opened — the templates list is the primary view,
 * not a form-first page.
 */
export function NewTemplateForm() {
  const [open, setOpen] = useState(false);
  const { state, pending, onSubmit } = useActionForm(createProjectTemplate);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus size={13} />
        New template
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card"
      style={{ padding: 16, display: "grid", gap: 12, marginBottom: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="t-label" style={{ fontSize: 12, color: "var(--ink-2)" }}>
          New template
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="btn-ghost"
          style={{ padding: 4, border: 0, background: "transparent", color: "var(--ink-4)", cursor: "pointer" }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <div className="grid gap-2">
          <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="new-template-name">
            Name
          </label>
          <div className="input" style={{ height: 32, paddingLeft: 12 }}>
            <input id="new-template-name" name="name" required autoComplete="off" placeholder="e.g. Onboarding rollout" />
          </div>
        </div>
        <div className="grid gap-2">
          <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="new-template-type">
            Project type
          </label>
          <select
            id="new-template-type"
            name="projectType"
            defaultValue=""
            className="input"
            style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}
          >
            <option value="">Unset</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="new-template-description">
          Description
        </label>
        <textarea
          id="new-template-description"
          name="description"
          rows={2}
          className="input"
          style={{ height: "auto", paddingTop: 8, paddingLeft: 12, resize: "vertical" }}
          placeholder="What this template is for and when to use it"
        />
      </div>

      {state?.error ? (
        <div style={{ fontSize: 11.5, color: "var(--danger)" }}>{state.error}</div>
      ) : null}

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create template"}
        </button>
      </div>
    </form>
  );
}
