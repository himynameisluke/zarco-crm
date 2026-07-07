import "server-only";

import { db } from "@/lib/db";
import { activities, deals } from "@/lib/db/schema";
import type { DealStage } from "@/app/(app)/deals/schema";

/**
 * The column-level semantics of a stage transition, shared by the web
 * actions and the MCP tools so a stage move means the same thing no matter
 * which surface made it:
 *
 *   - stageChangedAt is stamped (powers true days-in-stage on the kanban)
 *   - closing (won/lost) stamps closeDate with the ACTUAL close date —
 *     the expected date it replaces lives on in the status_change activity
 *   - going lost records lostReason; leaving lost clears it (the reason
 *     stays on the timeline via the activity)
 */
export function stageTransitionValues(
  to: DealStage,
  reason?: string | null,
): Partial<typeof deals.$inferInsert> {
  const values: Partial<typeof deals.$inferInsert> = {
    stage: to,
    stageChangedAt: new Date(),
    updatedAt: new Date(),
  };
  if (to === "won" || to === "lost") {
    values.closeDate = new Date().toISOString().slice(0, 10);
  }
  values.lostReason = to === "lost" ? (reason?.trim() || null) : null;
  return values;
}

/**
 * Writes the status_change activity for a stage move made from the web app.
 * (MCP writes its own via auditMcpWrite, which carries client metadata —
 * both produce type 'status_change' with the same metadata keys.)
 */
export async function logStageChange(args: {
  workspaceId: string;
  dealId: string;
  dealName: string;
  from: DealStage;
  to: DealStage;
  reason?: string | null;
  userId: string;
}) {
  const base = `Deal "${args.dealName}" moved from ${args.from} to ${args.to}`;
  await db.insert(activities).values({
    workspaceId: args.workspaceId,
    type: "status_change",
    source: "manual",
    subjectType: "deal",
    subjectId: args.dealId,
    subject: `${args.from} → ${args.to}`,
    body: args.reason ? `${base}\n\nReason: ${args.reason}` : base,
    metadata: {
      fromStage: args.from,
      toStage: args.to,
      reason: args.reason ?? undefined,
    },
    createdBy: args.userId,
  });
}
