"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, emailCampaigns, emailSends } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { campaignFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseForm(formData: FormData) {
  return campaignFormSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
    fromEmail: formData.get("fromEmail"),
    fromName: formData.get("fromName"),
    targetOrganizationId: formData.get("targetOrganizationId"),
  });
}

export async function createCampaign(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const targetOrgId = nullable(parsed.data.targetOrganizationId);

  const [inserted] = await db
    .insert(emailCampaigns)
    .values({
      name: parsed.data.name,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      fromEmail: parsed.data.fromEmail,
      fromName: nullable(parsed.data.fromName),
      status: "draft",
      createdBy: user.id,
    })
    .returning({ id: emailCampaigns.id });

  // Stash the target org id on the campaign by writing the email_sends rows
  // upfront — that way the campaign's "recipients" view is just a query.
  // We mark them queued; the (stubbed) send action will transition them later.
  if (targetOrgId) {
    const recipients = await db
      .select({
        id: contacts.id,
        email: contacts.email,
      })
      .from(contacts)
      .where(
        and(eq(contacts.organizationId, targetOrgId), isNotNull(contacts.email)),
      );

    if (recipients.length > 0) {
      await db.insert(emailSends).values(
        recipients.map((c) => ({
          campaignId: inserted.id,
          contactId: c.id,
          toEmail: c.email!,
          subject: parsed.data.subject,
          bodyHtml: parsed.data.bodyHtml,
          status: "queued" as const,
        })),
      );
    }
  }

  revalidatePath("/campaigns");
  redirect(`/campaigns/${inserted.id}`);
}

export async function updateCampaign(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Only allow editing while in draft status.
  const [existing] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);
  if (!existing) {
    return { error: "Campaign not found" };
  }
  if (existing.status !== "draft") {
    return { error: "Only draft campaigns can be edited" };
  }

  const targetOrgId = nullable(parsed.data.targetOrganizationId);

  await db
    .update(emailCampaigns)
    .set({
      name: parsed.data.name,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      fromEmail: parsed.data.fromEmail,
      fromName: nullable(parsed.data.fromName),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, id));

  // Replace queued recipients wholesale on edit.
  await db
    .delete(emailSends)
    .where(and(eq(emailSends.campaignId, id), eq(emailSends.status, "queued")));

  if (targetOrgId) {
    const recipients = await db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(
        and(eq(contacts.organizationId, targetOrgId), isNotNull(contacts.email)),
      );

    if (recipients.length > 0) {
      await db.insert(emailSends).values(
        recipients.map((c) => ({
          campaignId: id,
          contactId: c.id,
          toEmail: c.email!,
          subject: parsed.data.subject,
          bodyHtml: parsed.data.bodyHtml,
          status: "queued" as const,
        })),
      );
    }
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string) {
  await requireUser();
  // email_sends.campaignId is set null on delete (not cascade), so the
  // queued recipients survive the delete — clear them explicitly.
  await db.delete(emailSends).where(eq(emailSends.campaignId, id));
  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  revalidatePath("/campaigns");
  redirect("/campaigns");
}

/**
 * Stubbed send. Transitions the campaign through sending → sent and marks
 * every queued email_send row as sent (with synthetic timestamps).
 *
 * Until Resend is wired, no email actually goes out — this just records
 * the intent so we can reason about state. When Resend lands the same
 * action will swap the marker loop for the actual API calls.
 */
export async function sendCampaignStub(id: string) {
  await requireUser();

  await db
    .update(emailCampaigns)
    .set({
      status: "sending",
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, id));

  await db
    .update(emailSends)
    .set({
      status: "sent",
      sentAt: new Date(),
    })
    .where(and(eq(emailSends.campaignId, id), eq(emailSends.status, "queued")));

  await db
    .update(emailCampaigns)
    .set({ status: "sent", updatedAt: new Date() })
    .where(eq(emailCampaigns.id, id));

  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}
