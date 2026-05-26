"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import { createTaskQuick } from "@/app/(app)/tasks/actions";

type State = { error?: string; success?: boolean } | null;

export function TaskQuickAdd() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    createTaskQuick,
    null,
  );
  const titleRef = useRef<HTMLInputElement>(null);

  // Clear the input after a successful submit.
  useEffect(() => {
    if (state?.success && titleRef.current) {
      titleRef.current.value = "";
      titleRef.current.focus();
    }
  }, [state?.success]);

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div
        className="input"
        style={{ flex: 1, height: 32, paddingLeft: 12 }}
      >
        <Plus size={13} color="var(--ink-4)" />
        <input
          ref={titleRef}
          name="title"
          placeholder="Add a task — press Enter"
          required
          disabled={pending}
          autoComplete="off"
        />
      </div>
      <input
        name="dueAt"
        type="datetime-local"
        className="input"
        style={{
          width: 200,
          height: 32,
          paddingLeft: 10,
          fontFamily: "var(--code)",
          fontSize: 12.5,
        }}
        disabled={pending}
        aria-label="Due"
      />
      <button
        type="submit"
        className="btn btn-primary"
        style={{ height: 32 }}
        disabled={pending}
      >
        Add
      </button>
      {state?.error ? (
        <span
          style={{
            fontSize: 11.5,
            color: "var(--danger)",
            marginLeft: 8,
          }}
        >
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
