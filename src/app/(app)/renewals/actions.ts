"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activities, contracts, deals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { PERIODS_PER_YEAR, contractFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function poundsToPence(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseFormData(formData: FormData) {
  return contractFormSchema.safeParse({
    name: formData.get("name"),
    organizationId: formData.get("organizationId"),
    dealId: formData.get("dealId"),
    status: formData.get("status"),
    valuePounds:
      formData.get("valuePounds") === "" ? undefined : formData.get("valuePounds"),
    billingPeriod: formData.get("billingPeriod"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    autoRenew: formData.get("autoRenew") ?? "no",
    notes: formData.get("notes"),
  });
}

async function validateContractRefs(
  workspaceId: string,
  organizationId: string | null,
  dealId: string | null,
): Promise<string | null> {
  if (
    organizationId &&
    !(await entityInWorkspace("organization", organizationId, workspaceId))
  ) {
    return "Organization not found in this workspace";
  }
  if (dealId && !(await entityInWorkspace("deal", dealId, workspaceId))) {
    return "Deal not found in this workspace";
  }
  return null;
}

export async function createContract(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return { error: "Renewal date must be after the start date" };
  }

  const organizationId = nullable(parsed.data.organizationId);
  const dealId = nullable(parsed.data.dealId);
  const refError = await validateContractRefs(workspace.id, organizationId, dealId);
  if (refError) return { error: refError };

  const [inserted] = await db
    .insert(contracts)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      organizationId,
      dealId,
      status: parsed.data.status,
      valuePence: poundsToPence(formData.get("valuePounds")),
      billingPeriod: parsed.data.billingPeriod,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      autoRenew: parsed.data.autoRenew === "yes",
      notes: nullable(parsed.data.notes),
      ownerId: user.id,
    })
    .returning({ id: contracts.id });

  revalidatePath("/renewals");
  redirect(`/renewals/${inserted.id}/edit`);
}

export async function updateContract(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return { error: "Renewal date must be after the start date" };
  }

  const organizationId = nullable(parsed.data.organizationId);
  const dealId = nullable(parsed.data.dealId);
  const refError = await validateContractRefs(workspace.id, organizationId, dealId);
  if (refError) return { error: refError };

  await db
    .update(contracts)
    .set({
      name: parsed.data.name,
      organizationId,
      dealId,
      status: parsed.data.status,
      valuePence: poundsToPence(formData.get("valuePounds")),
      billingPeriod: parsed.data.billingPeriod,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      autoRenew: parsed.data.autoRenew === "yes",
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, id), eq(contracts.workspaceId, workspace.id)));

  revalidatePath("/renewals");
  redirect("/renewals");
}

export async function deleteContract(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  await db
    .delete(contracts)
    .where(and(eq(contracts.id, id), eq(contracts.workspaceId, workspace.id)));
  revalidatePath("/renewals");
  redirect("/renewals");
}

/**
 * Spawns the renewal opportunity for a contract: a pre-filled deal
 * (type retainer, stage qualified, value = annualised contract value,
 * close date = the renewal date) linked back via contracts.renewalDealId
 * so a contract only ever gets one open renewal deal.
 */
export async function createRenewalDeal(contractId: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspace.id)),
    )
    .limit(1);
  if (!contract) return { error: "Contract not found" };

  if (contract.renewalDealId) {
    // Verify the linked deal still exists (it's set-null on deal delete, but
    // guard against a stale link anyway).
    const [existing] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(
        and(
          eq(deals.id, contract.renewalDealId),
          eq(deals.workspaceId, workspace.id),
        ),
      )
      .limit(1);
    if (existing) {
      return { error: "A renewal deal already exists for this contract" };
    }
  }

  const annualisedPence =
    contract.valuePence != null
      ? contract.valuePence * PERIODS_PER_YEAR[contract.billingPeriod]
      : null;

  const dealId = await db.transaction(async (tx) => {
    const [deal] = await tx
      .insert(deals)
      .values({
        workspaceId: workspace.id,
        name: `Renewal — ${contract.name}`,
        type: "retainer",
        stage: "qualified",
        valuePence: annualisedPence,
        currency: contract.currency,
        closeDate: contract.endDate,
        organizationId: contract.organizationId,
        ownerId: contract.ownerId ?? user.id,
      })
      .returning({ id: deals.id });

    await tx
      .update(contracts)
      .set({ renewalDealId: deal.id, updatedAt: new Date() })
      .where(
        and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspace.id)),
      );

    await tx.insert(activities).values({
      workspaceId: workspace.id,
      type: "note",
      source: "system",
      subjectType: "deal",
      subjectId: deal.id,
      subject: `Renewal opportunity created from contract "${contract.name}"`,
      body: `Contract runs ${contract.startDate} → ${contract.endDate}. Deal value is the annualised contract value.`,
      metadata: { contractId },
      createdBy: user.id,
    });

    return deal.id;
  });

  revalidatePath("/renewals");
  revalidatePath("/deals");
  redirect(`/deals/${dealId}`);
}
