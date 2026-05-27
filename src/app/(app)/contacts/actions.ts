"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { contactFormSchema } from "./schema";

function nullable(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createContact(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = contactFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    title: formData.get("title"),
    linkedinUrl: formData.get("linkedinUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [inserted] = await db
    .insert(contacts)
    .values({
      workspaceId: workspace.id,
      firstName: parsed.data.firstName,
      lastName: nullable(parsed.data.lastName),
      email: nullable(parsed.data.email),
      phone: nullable(parsed.data.phone),
      title: nullable(parsed.data.title),
      linkedinUrl: nullable(parsed.data.linkedinUrl),
      notes: nullable(parsed.data.notes),
      ownerId: user.id,
    })
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  redirect(`/contacts/${inserted.id}`);
}

export async function updateContact(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = contactFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    title: formData.get("title"),
    linkedinUrl: formData.get("linkedinUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(contacts)
    .set({
      firstName: parsed.data.firstName,
      lastName: nullable(parsed.data.lastName),
      email: nullable(parsed.data.email),
      phone: nullable(parsed.data.phone),
      title: nullable(parsed.data.title),
      linkedinUrl: nullable(parsed.data.linkedinUrl),
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(
      and(eq(contacts.id, id), eq(contacts.workspaceId, workspace.id)),
    );

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .delete(contacts)
    .where(
      and(eq(contacts.id, id), eq(contacts.workspaceId, workspace.id)),
    );
  revalidatePath("/contacts");
  redirect("/contacts");
}
