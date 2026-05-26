"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";

/**
 * Records that a recipient viewed the quote, if not already recorded.
 * Called from the public page on first render.
 */
export async function recordQuoteView(token: string) {
  const [q] = await db
    .select({ id: quotes.id, viewedAt: quotes.viewedAt, status: quotes.status })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);

  if (!q) return;
  if (q.viewedAt) return;

  await db
    .update(quotes)
    .set({
      viewedAt: new Date(),
      status: q.status === "sent" ? "viewed" : q.status,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));
}

export async function acceptQuote(token: string) {
  const [q] = await db
    .select({ id: quotes.id, status: quotes.status })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);
  if (!q) return { error: "Quote not found" };
  if (q.status === "accepted") return { ok: true };
  if (q.status === "declined") return { error: "This quote was already declined" };

  await db
    .update(quotes)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${q.id}`);
  return { ok: true };
}

export async function declineQuote(token: string) {
  const [q] = await db
    .select({ id: quotes.id, status: quotes.status })
    .from(quotes)
    .where(eq(quotes.publicToken, token))
    .limit(1);
  if (!q) return { error: "Quote not found" };
  if (q.status === "declined") return { ok: true };
  if (q.status === "accepted") return { error: "This quote was already accepted" };

  await db
    .update(quotes)
    .set({
      status: "declined",
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, q.id));

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${q.id}`);
  return { ok: true };
}
