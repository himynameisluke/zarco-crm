"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
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
  });
}

/**
 * Validates that the org / contact a deal references belong to the caller's
 * workspace. The ids come straight from form data, and RLS is bypassed at the
 * connection level — without this, a forged request could link a deal to
 * another tenant's records and leak their names through joins.
 */
async function validateDealRefs(
  workspaceId: string,
  organizationId: string | null,
  primaryContactId: string | null,
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
  const refError = await validateDealRefs(
    workspace.id,
    organizationId,
    primaryContactId,
  );
  if (refError) return { error: refError };

  const [inserted] = await db
    .insert(deals)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      type: parsed.data.type,
      stage: parsed.data.stage,
      valuePence: poundsToPence(formData.get("valuePounds")),
      closeDate: nullableDate(formData.get("closeDate")),
      organizationId,
      primaryContactId,
      ownerId: user.id,
    })
    .returning({ id: deals.id });

  revalidatePath("/deals");
  redirect(`/deals/${inserted.id}`);
}

export async function updateDeal(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const organizationId = nullableUuid(formData.get("organizationId"));
  const primaryContactId = nullableUuid(formData.get("primaryContactId"));
  const refError = await validateDealRefs(
    workspace.id,
    organizationId,
    primaryContactId,
  );
  if (refError) return { error: refError };

  await db
    .update(deals)
    .set({
      name: parsed.data.name,
      type: parsed.data.type,
      stage: parsed.data.stage,
      valuePence: poundsToPence(formData.get("valuePounds")),
      closeDate: nullableDate(formData.get("closeDate")),
      organizationId,
      primaryContactId,
      updatedAt: new Date(),
    })
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)));

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

/** Update only the stage of a deal — used by the inline stage selector on the detail page. */
export async function updateDealStage(id: string, stage: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  if (!isDealStage(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }
  await db
    .update(deals)
    .set({ stage, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.workspaceId, workspace.id)));
  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
}
