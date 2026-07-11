import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { getPrimaryWorkspaceIdForUser } from "@/lib/workspace/current";

/**
 * Extracts the bound user id from the MCP request's auth context.
 *
 * The auth bridge in /mcp/route.ts stores the verified Zarco user id in
 * AuthInfo.extra.userId. Every tool that touches the DB calls this helper
 * so attribution and scoping happen in one place.
 */
export type McpAuthContext = {
  userId: string;
  clientId: string;
};

export function getMcpContext(authInfo: AuthInfo | undefined): McpAuthContext {
  if (!authInfo) {
    throw new Error("MCP request reached a tool without auth info");
  }
  const userId = (authInfo.extra as Record<string, unknown> | undefined)?.userId;
  if (typeof userId !== "string") {
    throw new Error("MCP auth info missing userId");
  }
  return {
    userId,
    clientId: authInfo.clientId,
  };
}

export type McpWorkspaceContext = McpAuthContext & { workspaceId: string };

/**
 * Resolves the caller AND the workspace every query must be scoped to.
 *
 * Preference order:
 *   1. The workspace BOUND TO THE GRANT (stamped at OAuth consent from the
 *      user's current-workspace cookie) — so a connection approved while
 *      acting in "Meridian Robotics" operates on Meridian's books, not
 *      whichever workspace happens to be the user's oldest. Membership is
 *      re-verified on every call; if it lapsed we FAIL CLOSED (no silent
 *      retarget to another tenant's books).
 *   2. Legacy tokens (no binding): the user's primary (earliest-created)
 *      workspace — the original behaviour, so existing connections are
 *      untouched.
 *
 * CRITICAL: our Drizzle client connects as the Postgres role, which BYPASSES
 * row-level security — so RLS is not a backstop here. Every tool MUST filter
 * its queries by this workspaceId or it will read/write across workspace
 * (tenant) boundaries. Going through this helper makes that scoping
 * unavoidable.
 */
export async function requireMcpWorkspace(
  authInfo: AuthInfo | undefined,
): Promise<McpWorkspaceContext> {
  const ctx = getMcpContext(authInfo);

  const bound = (authInfo?.extra as Record<string, unknown> | undefined)
    ?.workspaceId;
  if (typeof bound === "string" && bound.length > 0) {
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, bound),
          eq(workspaceMembers.userId, ctx.userId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new Error(
        "This connection is bound to a workspace you no longer belong to. Reconnect from the workspace you want it to act in.",
      );
    }
    return { ...ctx, workspaceId: bound };
  }

  const workspaceId = await getPrimaryWorkspaceIdForUser(ctx.userId);
  if (!workspaceId) {
    throw new Error("User has no workspace; cannot perform this action");
  }
  return { ...ctx, workspaceId };
}

/**
 * Standard text content wrapper. Tools call `textResult(payload)` to return
 * JSON-formatted output that Claude reads back.
 */
export function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}
