"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { moveProjectOnBoardCore } from "@/lib/projects/writes";

/**
 * Drag-drop board move — same interaction pattern as the deals kanban
 * (updateDealStage): a direct call, not a form action. Column keys are
 * either "__unphased" / "__complete" or a real phase name (see board.ts).
 * moveProjectOnBoardCore creates the phase row if the project doesn't have
 * one matching the column yet, applies any status transition crossing the
 * Complete boundary, and writes a single status_change activity.
 */
export async function moveProjectOnBoard(projectId: string, targetColumn: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const result = await moveProjectOnBoardCore({
    workspaceId: workspace.id,
    userId: user.id,
    projectId,
    targetColumn,
  });

  if ("error" in result) {
    return { error: "Project not found" };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}
