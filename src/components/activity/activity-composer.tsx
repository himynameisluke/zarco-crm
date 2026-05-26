"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Calendar, Loader2, Mail, Phone, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";
import { logManualActivity } from "@/app/activities/actions";

type SubjectType = "contact" | "organization" | "deal" | "project";

type State = { error?: string; success?: boolean } | null;

type ActivityType = "note" | "call" | "meeting" | "email";

const TYPES: { id: ActivityType; label: string; icon: typeof StickyNote }[] = [
  { id: "note", label: "Note", icon: StickyNote },
  { id: "call", label: "Call", icon: Phone },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "email", label: "Email", icon: Mail },
];

export function ActivityComposer({
  subjectType,
  subjectId,
}: {
  subjectType: SubjectType;
  subjectId: string;
}) {
  const [type, setType] = useState<ActivityType>("note");
  const [state, formAction, pending] = useActionState<State, FormData>(
    logManualActivity,
    null,
  );
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.success && subjectRef.current && bodyRef.current) {
      subjectRef.current.value = "";
      bodyRef.current.value = "";
      subjectRef.current.focus();
    }
  }, [state?.success]);

  return (
    <form
      action={formAction}
      className="card"
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="type" value={type} />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn("btn", "btn-sm")}
              style={{
                background: active ? "var(--surface-4)" : "transparent",
                borderColor: active ? "var(--hairline-2)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-3)",
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      <input
        ref={subjectRef}
        name="subject"
        className="input"
        style={{ height: 30 }}
        placeholder={`What happened — short headline (e.g. "Pricing call with Sarah")`}
        required
        disabled={pending}
        autoComplete="off"
      />

      <textarea
        ref={bodyRef}
        name="body"
        rows={3}
        placeholder="Optional detail, transcript, or follow-up notes"
        disabled={pending}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: "1px solid var(--hairline)",
          borderRadius: 7,
          padding: "8px 10px",
          color: "var(--ink-2)",
          fontSize: 13,
          fontFamily: "var(--ui)",
          resize: "vertical",
          minHeight: 60,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          className="t-mono"
          style={{ fontSize: 10.5, color: "var(--ink-4)" }}
        >
          Logged as manual {type}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {state?.error ? (
            <span style={{ fontSize: 11.5, color: "var(--danger)" }}>
              {state.error}
            </span>
          ) : null}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Log {type}
          </button>
        </div>
      </div>
    </form>
  );
}
