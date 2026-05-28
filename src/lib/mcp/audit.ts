import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { getPrimaryWorkspaceIdForUser } from "@/lib/workspace/current";

type SubjectType = "contact" | "organization" | "deal" | "project";

type ActivityType =
  | "email"
  | "call"
  | "meeting"
  | "note"
  | "status_change"
  | "task_completed"
  | "quote_sent"
  | "quote_viewed"
  | "quote_accepted";

/**
 * Records an audit entry for an MCP-originated write.
 *
 * Every write tool calls this so there's a single timeline row attached to
 * the affected entity showing what Claude did, on whose behalf. Source is
 * always 'mcp' — this is the load-bearing distinction that lets the UI
 * surface MCP writes differently (zap icon, magenta tint).
 *
 * Errors from the audit insert are caught and logged but never propagate —
 * a failed audit insert should not roll back the underlying write. The
 * write succeeded; we just lost some history.
 */
export async function auditMcpWrite({
  type,
  subjectType,
  subjectId,
  subject,
  body,
  userId,
  metadata,
}: {
  type: ActivityType;
  subjectType: SubjectType;
  subjectId: string;
  subject: string;
  body?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const workspaceId = await getPrimaryWorkspaceIdForUser(userId);
    if (!workspaceId) {
      console.error(
        "[mcp.audit] skipping audit insert — user has no workspace",
      );
      return;
    }
    await db.insert(activities).values({
      workspaceId,
      type,
      source: "mcp",
      subjectType,
      subjectId,
      subject,
      body: body ?? null,
      metadata: metadata ?? {},
      createdBy: userId,
    });
  } catch (err) {
    console.error("[mcp.audit] failed to record audit activity", err);
  }
}
