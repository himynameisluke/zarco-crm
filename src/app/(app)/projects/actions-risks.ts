"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { isWorkspaceMember } from "@/lib/workspace/members";
import { deleteRiskCore, raiseRiskCore, resolveRiskCore, updateRiskCore } from "@/lib/projects/writes";
import { projectRiskFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function raiseProjectRisk(projectId: string, _: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  if (!(await entityInWorkspace("project", projectId, workspace.id))) {
    return { error: "Project not found in this workspace" };
  }

  // The Likelihood field is removed from the DOM entirely when kind is
  // "blocker", so formData.get("likelihood") comes back null — `.optional()`
  // treats undefined as absent but rejects a bare null, so this (and every
  // other optional field here) needs `|| undefined`.
  const parsed = projectRiskFormSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    severity: formData.get("severity"),
    likelihood: formData.get("likelihood") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    mitigation: formData.get("mitigation") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ownerId = nullable(parsed.data.ownerId);
  if (ownerId && !(await isWorkspaceMember(workspace.id, ownerId))) {
    return { error: "Owner must be a member of this workspace" };
  }

  await raiseRiskCore({
    workspaceId: workspace.id,
    userId: user.id,
    projectId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    description: nullable(parsed.data.description),
    severity: parsed.data.severity,
    likelihood: parsed.data.likelihood || null,
    ownerId,
    mitigation: nullable(parsed.data.mitigation),
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function updateProjectRisk(id: string, projectId: string, _: unknown, formData: FormData) {
  const workspace = await requireCurrentWorkspace();

  // The Likelihood field is removed from the DOM entirely when kind is
  // "blocker", so formData.get("likelihood") comes back null — `.optional()`
  // treats undefined as absent but rejects a bare null, so this (and every
  // other optional field here) needs `|| undefined`.
  const parsed = projectRiskFormSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    severity: formData.get("severity"),
    likelihood: formData.get("likelihood") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    mitigation: formData.get("mitigation") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ownerId = nullable(parsed.data.ownerId);
  if (ownerId && !(await isWorkspaceMember(workspace.id, ownerId))) {
    return { error: "Owner must be a member of this workspace" };
  }

  const result = await updateRiskCore({
    workspaceId: workspace.id,
    id,
    patch: {
      title: parsed.data.title,
      description: nullable(parsed.data.description),
      severity: parsed.data.severity,
      likelihood: parsed.data.kind === "blocker" ? null : parsed.data.likelihood || null,
      ownerId,
      mitigation: nullable(parsed.data.mitigation),
    },
  });
  if ("error" in result) return { error: "Risk not found" };

  revalidatePath(`/projects/${projectId}`);
}

export async function resolveProjectRisk(id: string, projectId: string, resolution?: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const result = await resolveRiskCore({
    workspaceId: workspace.id,
    userId: user.id,
    id,
    resolution: nullable(resolution),
  });
  if ("error" in result) return { error: "Risk not found" };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function deleteProjectRisk(id: string, projectId: string) {
  const workspace = await requireCurrentWorkspace();
  await deleteRiskCore({ workspaceId: workspace.id, id });
  revalidatePath(`/projects/${projectId}`);
}
