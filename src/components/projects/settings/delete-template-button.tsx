"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteProjectTemplate } from "@/app/(app)/settings/projects/actions";

export function DeleteTemplateButton({ templateId, name }: { templateId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      style={{ color: "var(--danger)" }}
      onClick={() => {
        if (!window.confirm(`Delete template "${name}"? This removes its saved items too.`)) return;
        startTransition(() => {
          void deleteProjectTemplate(templateId);
        });
      }}
    >
      <Trash2 size={13} />
      {pending ? "Deleting…" : "Delete template"}
    </button>
  );
}
