"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { organizationFormSchema } from "./schema";

function nullable(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function nullableInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function createOrganization(_: unknown, formData: FormData) {
  const user = await requireUser();

  const employeeCountRaw = formData.get("employeeCount");
  const parsed = organizationFormSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    employeeCount: employeeCountRaw === "" ? undefined : employeeCountRaw,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [inserted] = await db
    .insert(organizations)
    .values({
      name: parsed.data.name,
      domain: nullable(parsed.data.domain),
      website: nullable(parsed.data.website),
      industry: nullable(parsed.data.industry),
      employeeCount: nullableInt(employeeCountRaw),
      notes: nullable(parsed.data.notes),
      ownerId: user.id,
    })
    .returning({ id: organizations.id });

  revalidatePath("/organizations");
  redirect(`/organizations/${inserted.id}`);
}

export async function updateOrganization(
  id: string,
  _: unknown,
  formData: FormData,
) {
  await requireUser();

  const employeeCountRaw = formData.get("employeeCount");
  const parsed = organizationFormSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    employeeCount: employeeCountRaw === "" ? undefined : employeeCountRaw,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(organizations)
    .set({
      name: parsed.data.name,
      domain: nullable(parsed.data.domain),
      website: nullable(parsed.data.website),
      industry: nullable(parsed.data.industry),
      employeeCount: nullableInt(employeeCountRaw),
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, id));

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${id}`);
  redirect(`/organizations/${id}`);
}

export async function deleteOrganization(id: string) {
  await requireUser();
  await db.delete(organizations).where(eq(organizations.id, id));
  revalidatePath("/organizations");
  redirect("/organizations");
}
