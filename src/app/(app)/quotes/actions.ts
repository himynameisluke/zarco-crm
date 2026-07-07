"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { activities, quoteLineItems, quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { entityInWorkspace } from "@/lib/mcp/scope";
import { lineItemSchema, quoteFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function poundsToPence(n: number): number {
  return Math.round(n * 100);
}

async function nextQuoteNumber(workspaceId: string): Promise<string> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quotes)
    .where(eq(quotes.workspaceId, workspaceId));
  const count = row?.n ?? 0;
  return `Q-${String(count + 1).padStart(4, "0")}`;
}

function totalsFromLineItems(lineItems: z.infer<typeof lineItemSchema>[], taxRate: number) {
  const subtotalPence = lineItems.reduce(
    (sum, li) => sum + Math.round(li.quantity * li.unitPricePounds * 100),
    0,
  );
  const totalPence = Math.round(subtotalPence * (1 + taxRate));
  return { subtotalPence, totalPence };
}

function parseLineItems(formData: FormData): z.infer<typeof lineItemSchema>[] {
  const raw = formData.get("lineItems");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseFormData(formData: FormData) {
  return quoteFormSchema.safeParse({
    dealId: formData.get("dealId"),
    organizationId: formData.get("organizationId"),
    contactId: formData.get("contactId"),
    currency: formData.get("currency") ?? "GBP",
    taxRate: formData.get("taxRate") ?? "0",
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    lineItems: parseLineItems(formData),
  });
}

/**
 * Validates that every entity a quote references belongs to the caller's
 * workspace. RLS is bypassed at the connection level, so unchecked ids from
 * form data could tie a quote to another tenant's deal/org/contact and leak
 * their data through joins (quote page, PDF, public viewer).
 */
async function validateQuoteRefs(
  workspaceId: string,
  data: { dealId: string; organizationId: string; contactId?: string | null },
): Promise<string | null> {
  if (!(await entityInWorkspace("deal", data.dealId, workspaceId))) {
    return "Deal not found in this workspace";
  }
  if (
    !(await entityInWorkspace("organization", data.organizationId, workspaceId))
  ) {
    return "Organization not found in this workspace";
  }
  const contactId = nullable(data.contactId);
  if (contactId && !(await entityInWorkspace("contact", contactId, workspaceId))) {
    return "Contact not found in this workspace";
  }
  return null;
}

export async function createQuote(_: unknown, formData: FormData) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const refError = await validateQuoteRefs(workspace.id, parsed.data);
  if (refError) return { error: refError };

  const { subtotalPence, totalPence } = totalsFromLineItems(
    parsed.data.lineItems,
    parsed.data.taxRate,
  );

  const quoteNumber = await nextQuoteNumber(workspace.id);

  const [inserted] = await db
    .insert(quotes)
    .values({
      workspaceId: workspace.id,
      quoteNumber,
      // dealId + organizationId are required (DB NOT NULL + zod uuid).
      // contactId stays optional.
      dealId: parsed.data.dealId,
      organizationId: parsed.data.organizationId,
      contactId: nullable(parsed.data.contactId),
      status: "draft",
      subtotalPence,
      taxRate: parsed.data.taxRate.toString(),
      totalPence,
      currency: parsed.data.currency,
      validUntil: nullable(parsed.data.validUntil),
      notes: nullable(parsed.data.notes),
      createdBy: user.id,
    })
    .returning({ id: quotes.id });

  if (parsed.data.lineItems.length > 0) {
    await db.insert(quoteLineItems).values(
      parsed.data.lineItems.map((li, i) => ({
        workspaceId: workspace.id,
        quoteId: inserted.id,
        description: li.description,
        quantity: li.quantity.toString(),
        unitPricePence: poundsToPence(li.unitPricePounds),
        totalPence: Math.round(li.quantity * li.unitPricePounds * 100),
        sortOrder: i,
      })),
    );
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${inserted.id}`);
}

export async function updateQuote(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const refError = await validateQuoteRefs(workspace.id, parsed.data);
  if (refError) return { error: refError };

  const { subtotalPence, totalPence } = totalsFromLineItems(
    parsed.data.lineItems,
    parsed.data.taxRate,
  );

  await db
    .update(quotes)
    .set({
      dealId: parsed.data.dealId,
      organizationId: parsed.data.organizationId,
      contactId: nullable(parsed.data.contactId),
      subtotalPence,
      taxRate: parsed.data.taxRate.toString(),
      totalPence,
      currency: parsed.data.currency,
      validUntil: nullable(parsed.data.validUntil),
      notes: nullable(parsed.data.notes),
      updatedAt: new Date(),
    })
    .where(
      and(eq(quotes.id, id), eq(quotes.workspaceId, workspace.id)),
    );

  // Replace line items wholesale.
  await db
    .delete(quoteLineItems)
    .where(
      and(
        eq(quoteLineItems.quoteId, id),
        eq(quoteLineItems.workspaceId, workspace.id),
      ),
    );
  if (parsed.data.lineItems.length > 0) {
    await db.insert(quoteLineItems).values(
      parsed.data.lineItems.map((li, i) => ({
        workspaceId: workspace.id,
        quoteId: id,
        description: li.description,
        quantity: li.quantity.toString(),
        unitPricePence: poundsToPence(li.unitPricePounds),
        totalPence: Math.round(li.quantity * li.unitPricePounds * 100),
        sortOrder: i,
      })),
    );
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  // quote_line_items cascade on quote delete via the FK.
  await db
    .delete(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspace.id)));
  revalidatePath("/quotes");
  redirect("/quotes");
}

/**
 * Marks the quote as sent (status + sentAt). Email send via Resend wires
 * up later — for now this transitions state so the public link can be
 * copy-pasted manually. NOTE: 'sent' is what makes the public /q/[token]
 * page + PDF live, so this is effectively "publish".
 *
 * Draft-only (matches the MCP send_quote guard): re-sending an accepted or
 * declined quote would overwrite sentAt and reopen a decided quote.
 */
export async function markQuoteSent(id: string) {
  const user = await requireUser();
  const workspace = await requireCurrentWorkspace();

  const [quote] = await db
    .select({
      status: quotes.status,
      quoteNumber: quotes.quoteNumber,
      dealId: quotes.dealId,
      totalPence: quotes.totalPence,
      currency: quotes.currency,
    })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspace.id)))
    .limit(1);
  if (!quote) return { error: "Quote not found" };
  if (quote.status !== "draft") {
    return { error: `Quote is already ${quote.status} — only drafts can be sent` };
  }

  await db
    .update(quotes)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspace.id)));

  // The pipeline should know a quote went out (quote_sent existed in the
  // enum but nothing ever wrote it).
  await db.insert(activities).values({
    workspaceId: workspace.id,
    type: "quote_sent",
    source: "manual",
    subjectType: "deal",
    subjectId: quote.dealId,
    subject: `Sent quote ${quote.quoteNumber}`,
    body: `Total ${(quote.totalPence / 100).toFixed(2)} ${quote.currency}`,
    metadata: { quoteId: id, quoteNumber: quote.quoteNumber },
    createdBy: user.id,
  });

  revalidatePath(`/quotes/${id}`);
}
