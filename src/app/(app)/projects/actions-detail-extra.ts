"use server";

// =============================================================================
// Project management — detail-workspace + wizard extras.
//
// Per the build brief: the shared action/query files (actions.ts,
// actions-*.ts, schema.ts, lib/projects/*) are consumed, never edited. This
// file adds the handful of thin wrappers the wizard + detail workspace need
// that don't already exist as a shared action:
//
//   - updateProjectDetailsForm  — full-form save (edit page) that redirects
//     on success, unlike updateProjectDetails (which is designed for partial
//     header-field patches and just revalidates).
//   - patchProjectField         — builds a FormData patch for
//     updateProjectDetails from a plain object, so header controls (status
//     select, health select, phase stepper, owner select, progress override)
//     can call one small helper instead of hand-rolling FormData each time.
//   - seedProjectTemplates      — lazy-seed trigger for the wizard's template
//     step when the workspace has no templates yet.
//   - loadMoreProjectActivities — pagination for the Activity tab beyond the
//     bundle's initial 20 rows.
// =============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { getProjectActivities } from "@/lib/projects/queries";
import { seedDefaultTemplatesCore } from "@/lib/projects/writes";
import { updateProjectDetails } from "./actions";

export async function updateProjectDetailsForm(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const result = await updateProjectDetails(id, formData);
  if (result && "error" in result) {
    return result;
  }
  redirect(`/projects/${id}`);
}

/**
 * Builds a FormData patch for updateProjectDetails from a plain object —
 * the shared action does its own zod parsing off FormData keys, so header
 * controls (status select, health select, phase stepper, owner select,
 * date pickers, progress override) can call this directly inside a
 * useTransition instead of constructing FormData by hand at each call site.
 * Only keys present in `fields` are touched (PATCH semantics, matching
 * updateProjectCore) — omit a key entirely to leave it untouched; pass ""
 * (or null) to clear a nullable field.
 */
export async function patchProjectField(
  id: string,
  fields: Record<string, string | null>,
): Promise<{ error?: string } | void> {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value ?? "");
  }
  return updateProjectDetails(id, fd);
}

/**
 * Lazily seeds the two built-in templates (Zarco Console Implementation,
 * Bespoke Software Build) into the current workspace. No-op if the
 * workspace already has any templates. Called from the wizard's template
 * step when the workspace has none yet.
 */
export async function seedProjectTemplates(): Promise<{ createdCount: number }> {
  const workspace = await requireCurrentWorkspace();
  const result = await seedDefaultTemplatesCore(workspace.id);
  revalidatePath("/projects/new");
  return result;
}

export async function loadMoreProjectActivities(projectId: string, page: number) {
  const workspace = await requireCurrentWorkspace();
  if (!(await entityInWorkspace("project", projectId, workspace.id))) {
    return { rows: [], total: 0 };
  }
  return getProjectActivities(workspace.id, projectId, page, 20);
}
