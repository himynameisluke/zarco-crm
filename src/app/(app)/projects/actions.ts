"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { projectFormSchema } from "./schema";

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
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [inserted] = await db
    .insert(projects)
    .values({
      name: parsed.data.name,
      status: parsed.data.status,
      dealId: nullable(parsed.data.dealId),
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
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(projects)
    .set({
      name: parsed.data.name,
      status: parsed.data.status,
      dealId: nullable(parsed.data.dealId),
      startDate: nullable(parsed.data.startDate),
      endDate: nullable(parsed.data.endDate),
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await requireUser();
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
  redirect("/projects");
}
