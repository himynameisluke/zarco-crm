"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { seedDefaultProjectTemplates } from "@/app/(app)/settings/projects/actions";

/**
 * Shown only when a workspace has zero templates yet — lazily creates the
 * two built-in templates (templates-seed.ts) as this workspace's own
 * editable rows. Not a prod data migration; a no-op if templates already
 * exist (seedDefaultTemplatesCore guards on that).
 */
export function SeedTemplatesButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await seedDefaultProjectTemplates();
          router.refresh();
        });
      }}
    >
      <Sparkles size={13} />
      {pending ? "Seeding…" : "Seed default templates"}
    </button>
  );
}
