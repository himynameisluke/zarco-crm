"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activities, quotes } from "@/lib/db/schema";

// All public-token actions share the same access rules as the /q/[token]
// viewer: drafts are invisible (treated as not-found), and a quote past its
// validUntil date can no longer be accepted or declined. These run
// unauthenticated, so the checks here are the entire boundary.

/** True when the quote's validUntil date (a DATE column, YYYY-MM-DD) has passed. */
function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return validUntil < today;
}

/**
 * Timeline events for the deal when the recipient views/accepts/declines.
 * source is 'system' — the actor is the (unauthenticated) recipient, not a
 * CRM user. Best-effort: a logging failure must never break the public page.
 */
async function logQuoteEvent(args: {
  workspaceId: string;
  dealId: string;
  type: "quote_viewed" | "quote_accepted" | "note";
  subject: string;
  quoteId: string;
  quoteNumber: string;
}) {
  try {
    await db.insert(activities).values({
      workspaceId: args.workspaceId,
      type: args.type,
      source: "system",
      subjectType: "deal",
      subjectId: args.dealId,
      subject: args.subject,
      metadata: { quoteId: args.quoteId, quoteNumber: args.quoteNumber },
    });
  } catch {
    // best-effort
  }
}

/**
 * Records that a recipient viewed the quote, if not already recorded.
 * Called from the public page on first render.
 */
export async function recordQuoteView(token: string) {
  const [q] = await db
    .select({
      id: quotes.id,
      viewedAt: quotes.viewedAt,
      status: quotes.status,
      workspaceId: quotes.workspaceId,
      dealId: quotes.dealId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);

  if (!q) return;
  if (q.status === "draft") return; // not public yet — mirror the viewer's 404
  if (q.viewedAt) return;

  await db
    .update(quotes)
    .set({
      viewedAt: new Date(),
      status: q.status === "sent" ? "viewed" : q.status,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));

  await logQuoteEvent({
    workspaceId: q.workspaceId,
    dealId: q.dealId,
    type: "quote_viewed",
    subject: `Quote ${q.quoteNumber} viewed by recipient`,
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
  });
}

export async function acceptQuote(token: string) {
  const [q] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      validUntil: quotes.validUntil,
      workspaceId: quotes.workspaceId,
      dealId: quotes.dealId,
      quoteNumber: quotes.quoteNumber,
      totalPence: quotes.totalPence,
      currency: quotes.currency,
    })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);
  if (!q || q.status === "draft") return { error: "Quote not found" };
  if (q.status === "accepted") return { ok: true };
  if (q.status === "declined") return { error: "This quote was already declined" };
  if (q.status === "expired" || isExpired(q.validUntil)) {
    if (q.status !== "expired") await markExpired(q.id);
    return { error: "This quote has expired — get in touch for an updated one" };
  }

  await db
    .update(quotes)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));

  // Land the acceptance on the deal's timeline — the single most important
  // signal the pipeline can receive.
  await logQuoteEvent({
    workspaceId: q.workspaceId,
    dealId: q.dealId,
    type: "quote_accepted",
    subject: `Quote ${q.quoteNumber} ACCEPTED (${(q.totalPence / 100).toFixed(2)} ${q.currency})`,
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
  });

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${q.id}`);
  return { ok: true };
}

export async function declineQuote(token: string) {
  const [q] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      validUntil: quotes.validUntil,
      workspaceId: quotes.workspaceId,
      dealId: quotes.dealId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);
  if (!q || q.status === "draft") return { error: "Quote not found" };
  if (q.status === "declined") return { ok: true };
  if (q.status === "accepted") return { error: "This quote was already accepted" };
  if (q.status === "expired" || isExpired(q.validUntil)) {
    if (q.status !== "expired") await markExpired(q.id);
    return { error: "This quote has expired" };
  }

  await db
    .update(quotes)
    .set({
      status: "declined",
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));

  // No quote_declined enum value — a note keeps the timeline honest.
  await logQuoteEvent({
    workspaceId: q.workspaceId,
    dealId: q.dealId,
    type: "note",
    subject: `Quote ${q.quoteNumber} declined by recipient`,
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
  });

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${q.id}`);
  return { ok: true };
}

async function markExpired(quoteId: string) {
  await db
    .update(quotes)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));
}
