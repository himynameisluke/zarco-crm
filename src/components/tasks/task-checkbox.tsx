"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";

import { toggleTaskDone } from "@/app/(app)/tasks/actions";

export function TaskCheckbox({
  taskId,
  status,
  overdue = false,
}: {
  taskId: string;
  status: string;
  overdue?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const isDone = status === "done";

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await toggleTaskDone(taskId, status);
        });
      }}
      aria-label={isDone ? "Mark as not done" : "Mark as done"}
      style={{
        width: 14,
        height: 14,
        marginTop: 3,
        border: isDone
          ? "1.5px solid var(--magenta)"
          : overdue
            ? "1.5px solid var(--danger)"
            : "1.5px solid var(--ink-40)",
        borderRadius: 3.5,
        background: isDone ? "var(--magenta)" : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: isDone ? "var(--paper)" : "transparent",
        flexShrink: 0,
        cursor: "pointer",
        padding: 0,
        opacity: pending ? 0.6 : 1,
        transition: "background .15s, border-color .15s, opacity .15s",
      }}
    >
      {isDone ? <Check size={10} strokeWidth={3} /> : null}
    </button>
  );
}
