"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { isWorkspaceMember } from "@/lib/workspace/members";
import {
  completeMilestoneCore,
  createMilestoneCore,
  deleteMilestoneCore,
  updateMilestoneCore,
} from "@/lib/projects/writes";
import { projectMilestoneFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function validateMilestoneRefs(
  workspaceId: string,
  data: { phaseId: string | null; ownerId: string | null },
): Promise<string | null> {
  if (data.phaseId && !(await entityInWorkspace("phase", data.phaseId, workspaceId))) {
    return "Phase not found in this workspace";
  }
  if (data.ownerId && !(await isWorkspaceMember(workspaceId, data.ownerId))) {
    return "Owner must be a member of this workspace";
  }
  return null;
}

export async function createProjectMilestone(projectId: string, _: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  if (!(await entityInWorkspace("project", projectId, workspace.id))) {
    return { error: "Project not found in this workspace" };
  }

  // Sweep: formData.get() returns null for any optional field a given form
  // doesn't render — `.optional()` only treats undefined as absent, so
  // every optional field here needs `|| undefined` (same convention as
  // the other project action files).
  const parsed = projectMilestoneFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    phaseId: formData.get("phaseId") || undefined,
    ownerId: formData.get("ownerId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const phaseId = nullable(parsed.data.phaseId);
  const ownerId = nullable(parsed.data.ownerId);
  const refError = await validateMilestoneRefs(workspace.id, { phaseId, ownerId });
  if (refError) return { error: refError };

  await createMilestoneCore({
    workspaceId: workspace.id,
    projectId,
    phaseId,
    name: parsed.data.name,
    description: nullable(parsed.data.description),
    dueDate: nullable(parsed.data.dueDate),
    ownerId,
    sortOrder: 0,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectMilestone(
  id: string,
  projectId: string,
  _: unknown,
  formData: FormData,
) {
  const workspace = await requireCurrentWorkspace();

  // Sweep: formData.get() returns null for any optional field a given form
  // doesn't render — `.optional()` only treats undefined as absent, so
  // every optional field here needs `|| undefined` (same convention as
  // the other project action files).
  const parsed = projectMilestoneFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    phaseId: formData.get("phaseId") || undefined,
    ownerId: formData.get("ownerId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const phaseId = nullable(parsed.data.phaseId);
  const ownerId = nullable(parsed.data.ownerId);
  const refError = await validateMilestoneRefs(workspace.id, { phaseId, ownerId });
  if (refError) return { error: refError };

  const result = await updateMilestoneCore({
    workspaceId: workspace.id,
    id,
    patch: {
      name: parsed.data.name,
      description: nullable(parsed.data.description),
      dueDate: nullable(parsed.data.dueDate),
      phaseId,
      ownerId,
    },
  });
  if ("error" in result) return { error: "Milestone not found" };

  revalidatePath(`/projects/${projectId}`);
}

export async function completeProjectMilestone(id: string, projectId: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const result = await completeMilestoneCore({ workspaceId: workspace.id, userId: user.id, id });
  if ("error" in result) return { error: "Milestone not found" };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function deleteProjectMilestone(id: string, projectId: string) {
  const workspace = await requireCurrentWorkspace();
  await deleteMilestoneCore({ workspaceId: workspace.id, id });
  revalidatePath(`/projects/${projectId}`);
}
