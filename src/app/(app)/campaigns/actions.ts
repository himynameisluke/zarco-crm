"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, emailCampaigns, emailSends } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
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
  const workspace = await requireCurrentWorkspace();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const targetOrgId = nullable(parsed.data.targetOrganizationId);

  // The target org must belong to this workspace — otherwise a forged form
  // could enumerate another tenant's contacts into a recipient list.
  if (
    targetOrgId &&
    !(await entityInWorkspace("organization", targetOrgId, workspace.id))
  ) {
    return { error: "Organization not found in this workspace" };
  }

  // One transaction: campaign + recipient rows commit together.
  const inserted = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(emailCampaigns)
      .values({
        workspaceId: workspace.id,
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
      const recipients = await tx
        .select({
          id: contacts.id,
          email: contacts.email,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspace.id),
            eq(contacts.organizationId, targetOrgId),
            isNotNull(contacts.email),
          ),
        );

      if (recipients.length > 0) {
        await tx.insert(emailSends).values(
          recipients.map((c) => ({
            workspaceId: workspace.id,
            campaignId: campaign.id,
            contactId: c.id,
            toEmail: c.email!,
            subject: parsed.data.subject,
            bodyHtml: parsed.data.bodyHtml,
            status: "queued" as const,
          })),
        );
      }
    }

    return campaign;
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${inserted.id}`);
}

export async function updateCampaign(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Only allow editing while in draft status.
  const [existing] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.workspaceId, workspace.id),
      ),
    )
    .limit(1);
  if (!existing) {
    return { error: "Campaign not found" };
  }
  if (existing.status !== "draft") {
    return { error: "Only draft campaigns can be edited" };
  }

  const targetOrgId = nullable(parsed.data.targetOrganizationId);

  if (
    targetOrgId &&
    !(await entityInWorkspace("organization", targetOrgId, workspace.id))
  ) {
    return { error: "Organization not found in this workspace" };
  }

  // One transaction — the old code could delete the queued recipients and
  // then fail before re-inserting, leaving the campaign with none.
  await db.transaction(async (tx) => {
    await tx
      .update(emailCampaigns)
      .set({
        name: parsed.data.name,
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        fromEmail: parsed.data.fromEmail,
        fromName: nullable(parsed.data.fromName),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailCampaigns.id, id),
          eq(emailCampaigns.workspaceId, workspace.id),
        ),
      );

    // Replace queued recipients wholesale on edit.
    await tx
      .delete(emailSends)
      .where(
        and(
          eq(emailSends.workspaceId, workspace.id),
          eq(emailSends.campaignId, id),
          eq(emailSends.status, "queued"),
        ),
      );

    if (targetOrgId) {
      const recipients = await tx
        .select({ id: contacts.id, email: contacts.email })
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspace.id),
            eq(contacts.organizationId, targetOrgId),
            isNotNull(contacts.email),
          ),
        );

      if (recipients.length > 0) {
        await tx.insert(emailSends).values(
          recipients.map((c) => ({
            workspaceId: workspace.id,
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
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  // email_sends.campaignId is set null on delete (not cascade), so the
  // queued recipients survive the delete — clear them explicitly, atomically.
  await db.transaction(async (tx) => {
    await tx
      .delete(emailSends)
      .where(
        and(
          eq(emailSends.workspaceId, workspace.id),
          eq(emailSends.campaignId, id),
        ),
      );
    await tx
      .delete(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, id),
          eq(emailCampaigns.workspaceId, workspace.id),
        ),
      );
  });
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
  const workspace = await requireCurrentWorkspace();

  // Guard: only drafts (or scheduled campaigns) can send — re-invoking on a
  // sent campaign used to reset sentAt and rewrite history.
  const [existing] = await db
    .select({ status: emailCampaigns.status })
    .from(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.workspaceId, workspace.id),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Campaign not found" };
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return { error: `Campaign is already ${existing.status}` };
  }

  // The stub transition is instantaneous, so 'sending' as a separate
  // persisted step bought nothing and left a stuck state on failure.
  // One transaction: mark the sends + the campaign together.
  await db.transaction(async (tx) => {
    await tx
      .update(emailSends)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(
        and(
          eq(emailSends.workspaceId, workspace.id),
          eq(emailSends.campaignId, id),
          eq(emailSends.status, "queued"),
        ),
      );

    await tx
      .update(emailCampaigns)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(emailCampaigns.id, id),
          eq(emailCampaigns.workspaceId, workspace.id),
        ),
      );
  });

  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}
