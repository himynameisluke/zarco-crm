import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

/** db or a drizzle transaction handle — both expose .update(). */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Allocates the next quote number for a workspace via an atomic
 * UPDATE ... RETURNING on workspaces.quote_counter.
 *
 * The previous scheme (count(*) + 1) collided under concurrency AND was
 * guaranteed to reissue a number after any quote delete. The counter is
 * monotonic: numbers are never reused, deletes leave gaps, and two
 * concurrent creates serialize on the row lock.
 */
export async function nextQuoteNumber(
  workspaceId: string,
  tx: DbOrTx = db,
): Promise<string> {
  const [row] = await tx
    .update(workspaces)
    .set({ quoteCounter: sql`${workspaces.quoteCounter} + 1` })
    .where(eq(workspaces.id, workspaceId))
    .returning({ n: workspaces.quoteCounter });
  if (!row) {
    throw new Error("Workspace not found while allocating a quote number");
  }
  return `Q-${String(row.n).padStart(4, "0")}`;
}
