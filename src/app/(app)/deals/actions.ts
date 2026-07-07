"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { isWorkspaceMember } from "@/lib/workspace/members";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { logStageChange, stageTransitionValues } from "@/lib/deals/stage";
import { DEAL_STAGES, dealFormSchema, type DealStage } from "./schema";

function nullableUuid(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value === "") return null;
  return value;
}

function nullableDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value === "") return null;
  return value;
}

function poundsToPence(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function isDealStage(value: unknown): value is DealStage {
  return typeof value === "string" && (DEAL_STAGES as readonly string[]).includes(value);
}

function parseFormData(formData: FormData) {
  return dealFormSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    stage: formData.get("stage"),
    valuePounds: formData.get("valuePounds") === "" ? undefined : formData.get("valuePounds"),
    closeDate: formData.get("closeDate"),
    organizationId: formData.get("organizationId"),
    primaryContactId: formData.get("primaryContactId"),
    ownerId: formData.get("ownerId"),
    lostReason: formData.get("lostReason"),
  });
}

/**
 * Validates that the org / contact a deal references belong to the caller's
 * workspace, and that the owner is a workspace member. The ids come straight
 * from form data, and RLS is bypassed at the connection level — without this,
 * a forged request could link a deal to another tenant's records and leak
 * their names through joins.
 */
async function validateDealRefs(
  workspaceId: string,
  organizationId: string | null,
  primaryContactId: string | null,
  ownerId: string | null,
): Promise<string | null> {
  if (
    organizationId &&
    !(await entityInWorkspace("organization", organizationId, workspaceId))
  ) {
    return "Organization not found in this workspace";
  }
  if (
    primaryContactId &&
    !(await entityInWorkspace("contact", primaryContactId, workspaceId))
  ) {
    return "Contact not found in this workspace";
  }
  if (ownerId && !(await isWorkspaceMember(workspaceId, ownerId))) {
    return "Owner must be a member of this workspace";
  }
  return null;
}

export async function createDeal(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const organizationId = nullableUuid(formData.get("organizationId"));
  const primaryContactId = nullableUuid(formData.get("primaryContactId"));
  const ownerId = nullableUuid(formData.get("ownerId")) ?? user.id;
  const refError = await validateDealRefs(
    workspace.id,
    organizationId,
    primaryContactId,
    ownerId,
  );
  if (refError) return { error: refError };

  const stage = parsed.data.stage;
  const lostReason =
    stage === "lost" ? parsed.data.lostReason?.trim() || null : null;

  const [inserted] = await db
    .insert(deals)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      type: parsed.data.type,
      stage,
      lostReason,
      valuePence: poundsToPence(formData.get("valuePounds")),
      closeDate: nullableDate(formData.get("closeDate")),
      organizationId,
      primaryContactId,
      ownerId,
    })
    .returning({ id: deals.id });

  revalidatePath("/deals");
  redirect(`/deals/${inserted.id}`);
}

export async function updateDeal(id: string, _: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const organizationId = nullableUuid(formData.get("organizationId"));
  const primaryContactId = nullableUuid(formData.get("primaryContactId"));
  const ownerId = nullableUuid(formData.get("ownerId"));
  const refError = await validateDealRefs(
    workspace.id,
    organizationId,
    primaryContactId,
    ownerId,
  );
  if (refError) return { error: refError };

  // Read the current stage first so a stage change through the edit form
  // gets the same side effects (stageChangedAt, closeDate stamp, lostReason,
  // status_change activity) as the inline stage selector and MCP.
  const [before] = await db
    .select({ name: deals.name, stage: deals.stage })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)))
    .limit(1);
  if (!before) {
    return { error: "Deal not found" };
  }

  const stageChanged = before.stage !== parsed.data.stage;
  const reason = parsed.data.lostReason?.trim() || null;

  await db
    .update(deals)
    .set({
      name: parsed.data.name,
      type: parsed.data.type,
      valuePence: poundsToPence(formData.get("valuePounds")),
      closeDate: nullableDate(formData.get("closeDate")),
      organizationId,
      primaryContactId,
      ...(ownerId ? { ownerId } : {}),
      updatedAt: new Date(),
      ...(stageChanged
        ? stageTransitionValues(parsed.data.stage, reason)
        : // Stage untouched — still allow editing the lost reason in place.
          { stage: parsed.data.stage, lostReason: parsed.data.stage === "lost" ? reason : null }),
    })
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)));

  if (stageChanged) {
    await logStageChange({
      workspaceId: workspace.id,
      dealId: id,
      dealName: parsed.data.name,
      from: before.stage,
      to: parsed.data.stage,
      reason,
      userId: user.id,
    });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}

export async function deleteDeal(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .delete(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)));
  revalidatePath("/deals");
  redirect("/deals");
}

/**
 * Update only the stage of a deal — used by the inline stage selector on the
 * detail page. `reason` is recorded as the lost reason when stage is 'lost'
 * and lands in the status_change activity either way.
 */
export async function updateDealStage(id: string, stage: string, reason?: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  if (!isDealStage(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }

  const [before] = await db
    .select({ name: deals.name, stage: deals.stage })
    .from(deals)
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)))
    .limit(1);
  if (!before || before.stage === stage) return;

  await db
    .update(deals)
    .set(stageTransitionValues(stage, reason ?? null))
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)));

  await logStageChange({
    workspaceId: workspace.id,
    dealId: id,
    dealName: before.name,
    from: before.stage,
    to: stage,
    reason: reason ?? null,
    userId: user.id,
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
}
