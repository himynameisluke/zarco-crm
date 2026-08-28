import "server-only";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { authUsers, workspaceMembers } from "@/lib/db/schema";

export type WorkspaceMember = {
  id: string;
  email: string | null;
  name: string;
  role: string;
};

// displayNameFromEmail moved to display-name.ts (pure, no server-only) so MCP
// payload mappers and their tests can use it; re-exported here for existing callers.
import { displayNameFromEmail } from "./display-name";
export { displayNameFromEmail };

/**
 * All members of a workspace with resolved display names, for owner/assignee
 * selects and owner display. Solo workspaces return a single row.
 */
export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const rows = await db
    .select({
      id: workspaceMembers.userId,
      email: authUsers.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt);

  return rows.map((r) => ({ ...r, name: displayNameFromEmail(r.email) }));
}

/**
 * True when the given user is a member of the workspace. Used to validate
 * owner/assignee ids supplied from forms — an unchecked id would let a forged
 * request assign records to arbitrary auth users.
 */
export async function isWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
