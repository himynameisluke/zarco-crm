"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { activities, tasks } from "@/lib/db/schema";
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

  // Guard against unparseable dates — new Date("garbage") is Invalid Date,
  // which would throw at insert time instead of returning a form error.
  let dueAt: Date | null = null;
  if (parsed.data.dueAt && parsed.data.dueAt.length > 0) {
    const d = new Date(parsed.data.dueAt);
    if (Number.isNaN(d.getTime())) {
      return { error: "Couldn't understand that due date" };
    }
    dueAt = d;
  }

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

export async function toggleTaskDone(id: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  // Read the row rather than trusting a client-supplied status — a stale
  // value would flip the task the wrong way.
  const [task] = await db
    .select({
      status: tasks.status,
      title: tasks.title,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id)))
    .limit(1);
  if (!task) return;

  const nextStatus = task.status === "done" ? "todo" : "done";
  const completedAt = nextStatus === "done" ? new Date() : null;
  await db
    .update(tasks)
    .set({
      status: nextStatus,
      completedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspace.id)));

  // Completing a task that's attached to a record leaves a trace on that
  // record's timeline (the task_completed enum existed but was never used).
  if (nextStatus === "done" && task.subjectType && task.subjectId) {
    await db.insert(activities).values({
      workspaceId: workspace.id,
      type: "task_completed",
      source: "manual",
      subjectType: task.subjectType,
      subjectId: task.subjectId,
      subject: `Completed: ${task.title}`,
      metadata: { taskId: id },
      createdBy: user.id,
    });
  }

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
