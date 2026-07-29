"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import {
  createTemplateCore,
  deleteTemplateCore,
  replaceTemplateItemsCore,
  seedDefaultTemplatesCore,
  updateProjectSettingsCore,
  updateTemplateCore,
} from "@/lib/projects/writes";
import { projectTemplateFormSchema } from "@/app/(app)/projects/schema";
import { defaultPhasesFormSchema, templateItemsEditorSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseTemplateFormData(formData: FormData) {
  return projectTemplateFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    projectType: formData.get("projectType"),
  });
}

export async function createProjectTemplate(_: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  const parsed = parseTemplateFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id } = await createTemplateCore({
    workspaceId: workspace.id,
    name: parsed.data.name,
    description: nullable(parsed.data.description),
    projectType: nullable(parsed.data.projectType),
  });

  revalidatePath("/settings/projects");
  redirect(`/settings/projects/${id}`);
}

export async function updateProjectTemplate(id: string, _: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  const parsed = parseTemplateFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateTemplateCore({
    workspaceId: workspace.id,
    id,
    patch: {
      name: parsed.data.name,
      description: nullable(parsed.data.description),
      projectType: nullable(parsed.data.projectType),
    },
  });
  if ("error" in result) return { error: "Template not found" };

  revalidatePath("/settings/projects");
  revalidatePath(`/settings/projects/${id}`);
}

export async function deleteProjectTemplate(id: string) {
  const workspace = await requireCurrentWorkspace();
  await deleteTemplateCore({ workspaceId: workspace.id, id });
  revalidatePath("/settings/projects");
  redirect("/settings/projects");
}

function parseItemsJson(formData: FormData): unknown[] {
  const raw = formData.get("items");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a template's full item list at once (items editor "save" button) —
 * same wholesale-replace pattern as the quote line-items editor: the whole
 * set comes in as one JSON-encoded field and fully replaces what's there.
 */
export async function saveProjectTemplateItems(templateId: string, _: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  if (!(await entityInWorkspace("template", templateId, workspace.id))) {
    return { error: "Template not found in this workspace" };
  }

  const parsed = templateItemsEditorSchema.safeParse({ items: parseItemsJson(formData) });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid items" };
  }

  await replaceTemplateItemsCore({
    workspaceId: workspace.id,
    templateId,
    items: parsed.data.items.map((item) => ({
      kind: item.kind,
      name: item.name,
      description: nullable(item.description),
      phaseName: nullable(item.phaseName),
      offsetDays: item.offsetDays ?? null,
      sortOrder: item.sortOrder,
    })),
  });

  revalidatePath(`/settings/projects/${templateId}`);
}

function parsePhasesJson(formData: FormData): unknown[] {
  const raw = formData.get("phases");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function updateDefaultPhases(_: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  const parsed = defaultPhasesFormSchema.safeParse({ phases: parsePhasesJson(formData) });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await updateProjectSettingsCore({ workspaceId: workspace.id, defaultPhases: parsed.data.phases });
  revalidatePath("/settings/projects");
  revalidatePath("/projects");
}

/**
 * Lazy-seed action: inserts the two built-in templates (templates-seed.ts)
 * for the current workspace when it has none yet. No-op otherwise. Called
 * on first visit to /settings/projects — not a prod data migration.
 */
export async function seedDefaultProjectTemplates() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { createdCount } = await seedDefaultTemplatesCore(workspace.id);
  if (createdCount > 0) {
    revalidatePath("/settings/projects");
  }
  return { createdCount };
}
