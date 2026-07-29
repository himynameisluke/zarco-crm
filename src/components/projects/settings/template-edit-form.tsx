"use client";

import { updateProjectTemplate } from "@/app/(app)/settings/projects/actions";
import { useActionForm } from "@/lib/use-action-form";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/lib/projects/labels";

export function TemplateEditForm({
  templateId,
  name,
  description,
  projectType,
}: {
  templateId: string;
  name: string;
  description: string | null;
  projectType: string | null;
}) {
  const boundAction = updateProjectTemplate.bind(null, templateId);
  const { state, pending, onSubmit } = useActionForm(boundAction);

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <div className="grid gap-2">
          <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="template-name">
            Name
          </label>
          <div className="input" style={{ height: 32, paddingLeft: 12 }}>
            <input id="template-name" name="name" required defaultValue={name} autoComplete="off" />
          </div>
        </div>
        <div className="grid gap-2">
          <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="template-type">
            Project type
          </label>
          <select
            id="template-type"
            name="projectType"
            defaultValue={projectType ?? ""}
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
        <label className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }} htmlFor="template-description">
          Description
        </label>
        <textarea
          id="template-description"
          name="description"
          rows={2}
          defaultValue={description ?? ""}
          className="input"
          style={{ height: "auto", paddingTop: 8, paddingLeft: 12, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </button>
        {state?.error ? <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{state.error}</span> : null}
      </div>
    </form>
  );
}
