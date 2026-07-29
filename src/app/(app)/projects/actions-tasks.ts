"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { isWorkspaceMember } from "@/lib/workspace/members";
import {
  bulkUpdateProjectTasksCore,
  completeProjectTaskCore,
  createProjectTaskCore,
  deleteProjectTaskCore,
  reorderProjectTasksCore,
  setProjectTaskStatusCore,
  updateProjectTaskCore,
} from "@/lib/projects/writes";
import { TASK_STATUSES, type TaskStatusValue } from "@/lib/projects/labels";
import { projectTaskFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isTaskStatus(value: unknown): value is TaskStatusValue {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

async function validateTaskRefs(
  workspaceId: string,
  data: { assignedTo: string | null; projectPhaseId: string | null; milestoneId: string | null },
): Promise<string | null> {
  if (data.assignedTo && !(await isWorkspaceMember(workspaceId, data.assignedTo))) {
    return "Assignee must be a member of this workspace";
  }
  if (data.projectPhaseId && !(await entityInWorkspace("phase", data.projectPhaseId, workspaceId))) {
    return "Phase not found in this workspace";
  }
  if (data.milestoneId && !(await entityInWorkspace("milestone", data.milestoneId, workspaceId))) {
    return "Milestone not found in this workspace";
  }
  return null;
}

export async function createProjectTask(projectId: string, _: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  if (!(await entityInWorkspace("project", projectId, workspace.id))) {
    return { error: "Project not found in this workspace" };
  }

  const parsed = projectTaskFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    priority: formData.get("priority") || undefined,
    assignedTo: formData.get("assignedTo"),
    projectPhaseId: formData.get("projectPhaseId"),
    milestoneId: formData.get("milestoneId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const assignedTo = nullable(parsed.data.assignedTo);
  const projectPhaseId = nullable(parsed.data.projectPhaseId);
  const milestoneId = nullable(parsed.data.milestoneId);

  const refError = await validateTaskRefs(workspace.id, { assignedTo, projectPhaseId, milestoneId });
  if (refError) return { error: refError };

  await createProjectTaskCore({
    workspaceId: workspace.id,
    userId: user.id,
    projectId,
    title: parsed.data.title,
    description: nullable(parsed.data.description),
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    priority: parsed.data.priority,
    assignedTo,
    projectPhaseId,
    milestoneId,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectTask(id: string, projectId: string, _: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  const parsed = projectTaskFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    priority: formData.get("priority") || undefined,
    assignedTo: formData.get("assignedTo"),
    projectPhaseId: formData.get("projectPhaseId"),
    milestoneId: formData.get("milestoneId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const assignedTo = nullable(parsed.data.assignedTo);
  const projectPhaseId = nullable(parsed.data.projectPhaseId);
  const milestoneId = nullable(parsed.data.milestoneId);

  const refError = await validateTaskRefs(workspace.id, { assignedTo, projectPhaseId, milestoneId });
  if (refError) return { error: refError };

  const result = await updateProjectTaskCore({
    workspaceId: workspace.id,
    id,
    patch: {
      title: parsed.data.title,
      description: nullable(parsed.data.description),
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      priority: parsed.data.priority,
      assignedTo,
      projectPhaseId,
      milestoneId,
    },
  });
  if ("error" in result) return { error: "Task not found" };

  revalidatePath(`/projects/${projectId}`);
}

export async function changeProjectTaskStatus(id: string, projectId: string, status: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  if (!isTaskStatus(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await setProjectTaskStatusCore({ workspaceId: workspace.id, userId: user.id, id, status });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function completeProjectTask(id: string, projectId: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  await completeProjectTaskCore({ workspaceId: workspace.id, userId: user.id, id });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function bulkUpdateProjectTasks(
  projectId: string,
  ids: string[],
  patch: { status?: string; assignedTo?: string | null },
) {
  const workspace = await requireCurrentWorkspace();

  if (patch.status !== undefined && !isTaskStatus(patch.status)) {
    return { error: "Invalid status" };
  }
  if (patch.assignedTo && !(await isWorkspaceMember(workspace.id, patch.assignedTo))) {
    return { error: "Assignee must be a member of this workspace" };
  }

  await bulkUpdateProjectTasksCore({
    workspaceId: workspace.id,
    ids,
    status: patch.status as TaskStatusValue | undefined,
    assignedTo: patch.assignedTo,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function reorderProjectTasks(projectId: string, orderedIds: string[]) {
  const workspace = await requireCurrentWorkspace();
  await reorderProjectTasksCore({ workspaceId: workspace.id, orderedIds });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectTask(id: string, projectId: string) {
  const workspace = await requireCurrentWorkspace();
  await deleteProjectTaskCore({ workspaceId: workspace.id, id });
  revalidatePath(`/projects/${projectId}`);
}
