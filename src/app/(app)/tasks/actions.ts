"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

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
  const nextStatus = currentStatus === "done" ? "todo" : "done";
  const completedAt = nextStatus === "done" ? new Date() : null;
  await db
    .update(tasks)
    .set({
      status: nextStatus,
      completedAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await requireUser();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/");
}
