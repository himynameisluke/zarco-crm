import "server-only";

import { db } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { displayNameFromEmail } from "./members";

/**
 * Creates a first workspace for a user who has none.
 *
 * Sign-up never provisioned a workspace, so a brand-new account hit
 * "No current workspace" on every page until one was created out-of-band.
 * The (app) layout calls this lazily when getCurrentWorkspace() returns
 * null — which also covers users created via email-confirmation, invites,
 * or the Supabase dashboard, not just the sign-up form.
 *
 * Concurrency: two parallel first-requests could race here. The slug is
 * deterministic per user and globally unique, so the loser hits the unique
 * constraint — swallow it and let the caller re-resolve the workspace.
 */
export async function bootstrapWorkspaceForUser(
  userId: string,
  email: string | null,
): Promise<void> {
  const name = email ? `${displayNameFromEmail(email)}'s workspace` : "My workspace";
  const slug = `ws-${userId.slice(0, 8)}`;

  try {
    await db.transaction(async (tx) => {
      const [ws] = await tx
        .insert(workspaces)
        .values({ name, slug, type: "real", ownerId: userId })
        .returning({ id: workspaces.id });

      await tx.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId,
        role: "owner",
      });
    });
  } catch (err) {
    // 23505 = unique_violation → a concurrent request won the race and the
    // workspace exists. Anything else is a real failure.
    const code = (err as { code?: string })?.code;
    if (code !== "23505") throw err;
  }
}
