import "server-only";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Current workspace context
// =============================================================================
// Resolves which workspace the current request operates on. Source of truth:
//
//   1. `currentWorkspaceId` cookie set when the user switches workspace.
//   2. Fall back to the user's first workspace by created_at (their primary).
//   3. If neither — they're not a member of any workspace; the caller decides
//      (most pages will redirect or 404).
//
// Verifies membership before returning. A stale cookie pointing at a
// workspace the user no longer belongs to is treated as missing.

export const CURRENT_WORKSPACE_COOKIE = "currentWorkspaceId";

export type CurrentWorkspace = {
  id: string;
  name: string;
  type: "real" | "demo";
  slug: string;
  userId: string;
};

/**
 * Returns the workspace the current request is operating on, or null if
 * the caller isn't signed in / has no workspaces. Server-only.
 */
export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;

  // Try the cookie first — verify the user is still a member of that workspace.
  if (cookieId) {
    const [row] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        type: workspaces.type,
      })
      .from(workspaces)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, workspaces.id),
          eq(workspaceMembers.userId, user.id),
        ),
      )
      .where(eq(workspaces.id, cookieId))
      .limit(1);
    if (row) return { ...row, userId: user.id };
  }

  // Fall back to the user's first workspace by created_at.
  const [primary] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .orderBy(workspaces.createdAt)
    .limit(1);

  if (!primary) return null;
  return { ...primary, userId: user.id };
}

/**
 * Like getCurrentWorkspace but throws when the user isn't signed in or has
 * no workspace — for use deep in server actions where the caller has already
 * verified auth and just needs the workspace id to scope a query.
 */
export async function requireCurrentWorkspace(): Promise<CurrentWorkspace> {
  const ws = await getCurrentWorkspace();
  if (!ws) {
    throw new Error("No current workspace — sign in and pick one first");
  }
  return ws;
}

/**
 * Returns the given user's primary (earliest-created) workspace id, or null
 * if they aren't a member of any. Used by MCP tools and other contexts that
 * don't have access to the workspace cookie. Phase-3 will replace this with
 * real per-request workspace selection.
 */
export async function getPrimaryWorkspaceIdForUser(
  userId: string,
): Promise<string | null> {
  const [primary] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .orderBy(workspaces.createdAt)
    .limit(1);
  return primary?.id ?? null;
}
