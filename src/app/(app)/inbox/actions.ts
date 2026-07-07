"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { activities, inboxItems } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";

const SUBJECT_TYPES = ["contact", "organization", "deal", "project"] as const;
const ACTIVITY_TYPES = [
  "email",
  "call",
  "meeting",
  "note",
] as const;

const processSchema = z.object({
  itemId: z.string().uuid(),
  subjectType: z.enum(SUBJECT_TYPES),
  subjectId: z.string().uuid(),
  activityType: z.enum(ACTIVITY_TYPES),
});

export async function processInboxItem(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = processSchema.safeParse({
    itemId: formData.get("itemId"),
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    activityType: formData.get("activityType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [item] = await db
    .select()
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.id, parsed.data.itemId),
        eq(inboxItems.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!item) {
    return { error: "Inbox item not found" };
  }
  if (item.status !== "pending") {
    return { error: "Inbox item already triaged" };
  }

  // The triage target must belong to this workspace — subjectId is
  // user-supplied and activities have no FK on it, so without this check a
  // forged request could file an activity against another tenant's record.
  const subjectOk = await entityInWorkspace(
    parsed.data.subjectType,
    parsed.data.subjectId,
    workspace.id,
  );
  if (!subjectOk) {
    return { error: "Record not found in this workspace" };
  }

  // One transaction — if the status update failed after the activity insert,
  // the item stayed 'pending' and a retry would duplicate the activity.
  await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({
        workspaceId: workspace.id,
        type: parsed.data.activityType,
        // Granola/MCP-sourced items keep their original source; manual triage from
        // outlook/resend collapses to email_sync/system in the activity record.
        source:
          item.source === "granola"
            ? "granola"
            : item.source === "mcp"
              ? "mcp"
              : item.source === "outlook"
                ? "email_sync"
                : "system",
        subjectType: parsed.data.subjectType,
        subjectId: parsed.data.subjectId,
        subject: item.title,
        body: item.body,
        metadata: item.metadata as Record<string, unknown>,
        occurredAt: item.receivedAt,
        createdBy: user.id,
      })
      .returning();

    await tx
      .update(inboxItems)
      .set({
        status: "processed",
        processedAt: new Date(),
        processedIntoActivityId: activity.id,
      })
      .where(
        and(
          eq(inboxItems.id, parsed.data.itemId),
          eq(inboxItems.workspaceId, workspace.id),
        ),
      );
  });

  revalidatePath("/inbox");
  revalidatePath("/activity");
  revalidatePath("/");
  return { success: true };
}

export async function dismissInboxItem(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .update(inboxItems)
    .set({ status: "dismissed", processedAt: new Date() })
    .where(
      and(
        eq(inboxItems.id, id),
        eq(inboxItems.workspaceId, workspace.id),
      ),
    );
  revalidatePath("/inbox");
  revalidatePath("/");
}

export async function undismissInboxItem(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .update(inboxItems)
    .set({ status: "pending", processedAt: null })
    .where(
      and(
        eq(inboxItems.id, id),
        eq(inboxItems.workspaceId, workspace.id),
      ),
    );
  revalidatePath("/inbox");
}

/**
 * Demo helper — drops a sample Granola transcript into the inbox so you can
 * see the triage flow without wiring Granola first. Wired to the "Add sample"
 * button on /inbox.
 */
export async function seedSampleInboxItem() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db.insert(inboxItems).values({
    workspaceId: workspace.id,
    type: "transcript",
    source: "granola",
    title: "Discovery call · Acme Foods (sample)",
    body: "30-minute call. Key points:\n- They're evaluating 3 vendors for Q3 implementation\n- Budget approved up to £45k\n- Decision maker is Sarah Hwang (VP Ops), economic buyer is the CFO\n- Next step: send case studies + draft SOW by Friday\n\nFollow-up: schedule second call once procurement gets involved.",
    metadata: { duration_minutes: 32, attendees: ["Sarah Hwang", "Luke"] },
  });
  revalidatePath("/inbox");
  revalidatePath("/");
}
