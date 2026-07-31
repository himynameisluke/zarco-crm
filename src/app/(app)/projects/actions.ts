"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activities, projects, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { isWorkspaceMember } from "@/lib/workspace/members";
import { createProjectCore, updateProjectCore } from "@/lib/projects/writes";
import { projectDetailsUpdateSchema, projectFormSchema, projectWizardSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseFormData(formData: FormData) {
  return projectFormSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    dealId: formData.get("dealId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  });
}

export async function createProject(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Deal reference must live in the caller's workspace — RLS is bypassed,
  // so this check is the tenant boundary.
  const dealId = nullable(parsed.data.dealId);
  if (dealId && !(await entityInWorkspace("deal", dealId, workspace.id))) {
    return { error: "Deal not found in this workspace" };
  }

  const [inserted] = await db
    .insert(projects)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      status: parsed.data.status,
      dealId,
      startDate: nullable(parsed.data.startDate),
      endDate: nullable(parsed.data.endDate),
      notes: nullable(parsed.data.notes),
      ownerId: user.id,
    })
    .returning({ id: projects.id });

  revalidatePath("/projects");
  redirect(`/projects/${inserted.id}`);
}

export async function updateProject(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const dealId = nullable(parsed.data.dealId);
  if (dealId && !(await entityInWorkspace("deal", dealId, workspace.id))) {
    return { error: "Deal not found in this workspace" };
  }

  await db
    .update(projects)
    .set({
      name: parsed.data.name,
      status: parsed.data.status,
      dealId,
      startDate: nullable(parsed.data.startDate),
      endDate: nullable(parsed.data.endDate),
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(
      and(eq(projects.id, id), eq(projects.workspaceId, workspace.id)),
    );

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  // Clean up polymorphic children (no FK) so they don't orphan.
  await db.transaction(async (tx) => {
    await tx
      .delete(activities)
      .where(
        and(
          eq(activities.workspaceId, workspace.id),
          eq(activities.subjectType, "project"),
          eq(activities.subjectId, id),
        ),
      );
    await tx
      .delete(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspace.id),
          eq(tasks.subjectType, "project"),
          eq(tasks.subjectId, id),
        ),
      );
    await tx
      .delete(projects)
      .where(
        and(eq(projects.id, id), eq(projects.workspaceId, workspace.id)),
      );
  });

  revalidatePath("/projects");
  redirect("/projects");
}

// =============================================================================
// Project management extensions — the wizard create + rich detail-page
// update. Additive: everything above is untouched so /projects/new and
// /projects/[id]/edit keep working exactly as before. These two are what
// the wizard / workspace-detail UI call instead.
// =============================================================================

function nullableWizard(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Reads a nullable field for updateProjectDetails with true PATCH
 * semantics: a key the caller never wrote into the FormData stays
 * `undefined` so downstream (projectDetailsUpdateSchema -> updateProjectCore)
 * leaves that column untouched entirely. patchProjectField only sets the
 * keys the caller actually passed, so `formData.has(key)` is exactly "was
 * this field part of this edit" — e.g. a phase-stepper click only sets
 * "currentPhaseId", so every other field here must resolve to undefined,
 * not null. A key that IS present but blank ("") is an explicit clear for
 * a nullable field (e.g. unsetting the phase, or blanking the edit form's
 * organization combobox) and resolves to null.
 */
function presentNullable(formData: FormData, key: string): string | null | undefined {
  if (!formData.has(key)) return undefined;
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

/** Same presence semantics as presentNullable(), for the numeric progressManual override. */
function presentNumber(formData: FormData, key: string): number | null | undefined {
  if (!formData.has(key)) return undefined;
  const raw = formData.get(key);
  if (raw === "" || raw == null) return null;
  return Number(raw);
}

/**
 * Creates a project from the wizard payload. When templateId is set, the
 * template's phases/milestones/tasks are expanded (expandTemplate) and
 * inserted alongside the project in ONE transaction (see
 * createProjectCore in lib/projects/writes.ts, shared with the MCP
 * create_project tool so nothing forks).
 */
export async function createProjectWizard(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  // formData.get() returns null (not undefined) for a field the wizard step
  // never rendered — `.optional()` in projectWizardSchema only treats
  // undefined as absent, so a bare formData.get() here fails validation on
  // every field the current step left out of the DOM. `|| undefined`
  // normalizes null (and "") to undefined, same convention already used
  // for status/health below.
  const parsed = projectWizardSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId") || undefined,
    dealId: formData.get("dealId") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    status: formData.get("status") || undefined,
    health: formData.get("health") || undefined,
    projectType: formData.get("projectType") || undefined,
    description: formData.get("description") || undefined,
    successCriteria: formData.get("successCriteria") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    notes: formData.get("notes") || undefined,
    templateId: formData.get("templateId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const organizationId = nullableWizard(parsed.data.organizationId);
  const dealId = nullableWizard(parsed.data.dealId);
  const ownerId = nullableWizard(parsed.data.ownerId) ?? user.id;
  const templateId = nullableWizard(parsed.data.templateId);

  if (organizationId && !(await entityInWorkspace("organization", organizationId, workspace.id))) {
    return { error: "Organization not found in this workspace" };
  }
  if (dealId && !(await entityInWorkspace("deal", dealId, workspace.id))) {
    return { error: "Deal not found in this workspace" };
  }
  if (ownerId && !(await isWorkspaceMember(workspace.id, ownerId))) {
    return { error: "Owner must be a member of this workspace" };
  }
  if (templateId && !(await entityInWorkspace("template", templateId, workspace.id))) {
    return { error: "Template not found in this workspace" };
  }

  const { id } = await createProjectCore({
    workspaceId: workspace.id,
    userId: user.id,
    name: parsed.data.name,
    organizationId,
    dealId,
    ownerId,
    status: parsed.data.status,
    health: parsed.data.health,
    projectType: nullableWizard(parsed.data.projectType),
    description: nullableWizard(parsed.data.description),
    successCriteria: nullableWizard(parsed.data.successCriteria),
    startDate: nullableWizard(parsed.data.startDate),
    endDate: nullableWizard(parsed.data.endDate),
    notes: nullableWizard(parsed.data.notes),
    templateId,
  });

  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

/**
 * Full-field update for the project workspace (overview header, edit
 * dialog): status/health/phase/dates/owner/description/successCriteria/
 * progressManual. Writes status_change (incl. phase moves, metadata
 * {kind:'phase', from, to}) and owner-change activities per spec — see
 * updateProjectCore in lib/projects/writes.ts, shared with MCP update_project.
 */
export async function updateProjectDetails(id: string, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = projectDetailsUpdateSchema.safeParse({
    name: formData.get("name") || undefined,
    status: formData.get("status") || undefined,
    health: formData.get("health") || undefined,
    currentPhaseId: presentNullable(formData, "currentPhaseId"),
    organizationId: presentNullable(formData, "organizationId"),
    dealId: presentNullable(formData, "dealId"),
    ownerId: presentNullable(formData, "ownerId"),
    projectType: presentNullable(formData, "projectType"),
    description: presentNullable(formData, "description"),
    successCriteria: presentNullable(formData, "successCriteria"),
    progressManual: presentNumber(formData, "progressManual"),
    startDate: presentNullable(formData, "startDate"),
    endDate: presentNullable(formData, "endDate"),
    notes: presentNullable(formData, "notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  if (data.currentPhaseId && !(await entityInWorkspace("phase", data.currentPhaseId, workspace.id))) {
    return { error: "Phase not found in this workspace" };
  }
  if (data.organizationId && !(await entityInWorkspace("organization", data.organizationId, workspace.id))) {
    return { error: "Organization not found in this workspace" };
  }
  if (data.dealId && !(await entityInWorkspace("deal", data.dealId, workspace.id))) {
    return { error: "Deal not found in this workspace" };
  }
  if (data.ownerId && !(await isWorkspaceMember(workspace.id, data.ownerId))) {
    return { error: "Owner must be a member of this workspace" };
  }

  const result = await updateProjectCore({
    workspaceId: workspace.id,
    userId: user.id,
    id,
    patch: data,
  });
  if ("error" in result) {
    return { error: "Project not found" };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}
