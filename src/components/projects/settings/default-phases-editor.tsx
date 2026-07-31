"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { updateDefaultPhases } from "@/app/(app)/settings/projects/actions";
import { useActionForm } from "@/lib/use-action-form";

/**
 * Ordered list editor for project_settings.defaultPhases — the board view
 * (and the create wizard) fall back to this sequence for any workspace
 * without project-specific phases yet. Same wholesale-replace pattern as
 * the template items editor: local array state, serialized to one hidden
 * JSON field on submit.
 */
export function DefaultPhasesEditor({ initialPhases }: { initialPhases: string[] }) {
  const [phases, setPhases] = useState<string[]>(initialPhases);
  const [draft, setDraft] = useState("");
  const { state, pending, onSubmit } = useActionForm(updateDefaultPhases);

  function addPhase() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPhases((prev) => [...prev, trimmed]);
    setDraft("");
  }

  function removeAt(i: number) {
    setPhases((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="phases" value={JSON.stringify(phases)} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {phases.map((p, i) => (
          <li
            key={`${p}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderBottom: "1px solid var(--hairline)",
            }}
          >
            <span
              className="t-mono"
              style={{ fontSize: 10.5, color: "var(--ink-4)", width: 18, flexShrink: 0 }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1, minWidth: 0 }}>{p}</span>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${p} up`}
              className="btn-ghost"
              style={{
                padding: 4,
                border: 0,
                background: "transparent",
                color: "var(--ink-4)",
                cursor: i === 0 ? "default" : "pointer",
                opacity: i === 0 ? 0.35 : 1,
              }}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === phases.length - 1}
              aria-label={`Move ${p} down`}
              className="btn-ghost"
              style={{
                padding: 4,
                border: 0,
                background: "transparent",
                color: "var(--ink-4)",
                cursor: i === phases.length - 1 ? "default" : "pointer",
                opacity: i === phases.length - 1 ? 0.35 : 1,
              }}
            >
              <ArrowDown size={13} />
            </button>
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${p}`}
              className="btn-ghost"
              style={{
                padding: 4,
                border: 0,
                background: "transparent",
                color: "var(--ink-4)",
                cursor: "pointer",
              }}
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {phases.length === 0 ? (
          <li style={{ padding: "12px 18px", fontSize: 12.5, color: "var(--ink-4)" }}>
            No phases yet — add at least one below.
          </li>
        ) : null}
      </ul>

      <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--hairline)" }}>
        <div className="input" style={{ flex: 1, height: 32, paddingLeft: 12 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPhase();
              }
            }}
            placeholder="Add a phase name"
            autoComplete="off"
          />
        </div>
        <button type="button" onClick={addPhase} className="btn" style={{ height: 32 }}>
          <Plus size={13} />
          Add
        </button>
        <button type="submit" className="btn btn-primary" style={{ height: 32 }} disabled={pending}>
          {pending ? "Saving…" : "Save phases"}
        </button>
      </div>

      {state?.error ? (
        <div style={{ padding: "0 18px 14px", fontSize: 11.5, color: "var(--danger)" }}>
          {state.error}
        </div>
      ) : null}
    </form>
  );
}
