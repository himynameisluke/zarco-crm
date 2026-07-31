"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { addLinkCore, removeLinkCore } from "@/lib/projects/writes";
import { projectLinkFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function addProjectLink(projectId: string, _: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  if (!(await entityInWorkspace("project", projectId, workspace.id))) {
    return { error: "Project not found in this workspace" };
  }

  // Sweep: formData.get() returns null for any optional field a given form
  // doesn't render — normalize to undefined so `.optional()` treats it as
  // absent instead of failing validation.
  const parsed = projectLinkFormSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    kind: formData.get("kind") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await addLinkCore({
    workspaceId: workspace.id,
    userId: user.id,
    projectId,
    title: parsed.data.title,
    url: parsed.data.url,
    kind: nullable(parsed.data.kind),
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectLink(id: string, projectId: string) {
  const workspace = await requireCurrentWorkspace();
  await removeLinkCore({ workspaceId: workspace.id, id });
  revalidatePath(`/projects/${projectId}`);
}
