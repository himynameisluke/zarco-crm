"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { quoteLineItems, quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { lineItemSchema, quoteFormSchema } from "./schema";

function nullable(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function poundsToPence(n: number): number {
  return Math.round(n * 100);
}

async function nextQuoteNumber(): Promise<string> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(quotes);
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

export async function createQuote(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { subtotalPence, totalPence } = totalsFromLineItems(
    parsed.data.lineItems,
    parsed.data.taxRate,
  );

  const quoteNumber = await nextQuoteNumber();

  const [inserted] = await db
    .insert(quotes)
    .values({
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

  await db.insert(quoteLineItems).values(
    parsed.data.lineItems.map((li, i) => ({
      quoteId: inserted.id,
      description: li.description,
      quantity: li.quantity.toString(),
      unitPricePence: poundsToPence(li.unitPricePounds),
      totalPence: Math.round(li.quantity * li.unitPricePounds * 100),
      sortOrder: i,
    })),
  );

  revalidatePath("/quotes");
  redirect(`/quotes/${inserted.id}`);
}

export async function updateQuote(id: string, _: unknown, formData: FormData) {
  await requireUser();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

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
    .where(eq(quotes.id, id));

  // Replace line items wholesale.
  await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id));
  await db.insert(quoteLineItems).values(
    parsed.data.lineItems.map((li, i) => ({
      quoteId: id,
      description: li.description,
      quantity: li.quantity.toString(),
      unitPricePence: poundsToPence(li.unitPricePounds),
      totalPence: Math.round(li.quantity * li.unitPricePounds * 100),
      sortOrder: i,
    })),
  );

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  await requireUser();
  // quote_line_items cascade on quote delete via the FK.
  await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath("/quotes");
  redirect("/quotes");
}

/**
 * Marks the quote as sent (status + sentAt). Email send via Resend wires
 * up later — for now this just transitions state so the public link can
 * be copy-pasted manually.
 */
export async function markQuoteSent(id: string) {
  await requireUser();
  await db
    .update(quotes)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(quotes.id, id));
  revalidatePath(`/quotes/${id}`);
}
