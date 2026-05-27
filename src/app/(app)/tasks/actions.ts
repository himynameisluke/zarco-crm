"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";

const quickAddSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  dueAt: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
});

export async function createTaskQuick(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = quickAddSchema.safeParse({
    title: formData.get("title"),
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const dueAt =
    parsed.data.dueAt && parsed.data.dueAt.length > 0
      ? new Date(parsed.data.dueAt)
      : null;

  await db.insert(tasks).values({
    workspaceId: workspace.id,
    title: parsed.data.title,
    status: "todo",
    dueAt,
    createdBy: user.id,
    assignedTo: user.id,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTaskDone(id: string, currentStatus: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const nextStatus = currentStatus === "done" ? "todo" : "done";
  const completedAt = nextStatus === "done" ? new Date() : null;
  await db
    .update(tasks)
    .set({
      status: nextStatus,
      completedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id)));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id)));
  revalidatePath("/tasks");
  revalidatePath("/");
}
