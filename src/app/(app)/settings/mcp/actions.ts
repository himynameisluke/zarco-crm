"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthAccessTokens, oauthAuthorizationCodes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * Disconnects an OAuth client from the CURRENT USER's account: revokes all
 * of their live access tokens for it and deletes their pending authorization
 * codes.
 *
 * Deliberately does NOT delete the oauth_clients row — the client itself
 * isn't owned by any one user (registration is anonymous DCR), and deleting
 * it would cascade-revoke every OTHER user's tokens too. Scoping every write
 * to (clientId, userId) is what makes this safe to expose in the UI.
 */
export async function revokeOAuthClient(clientId: string) {
  const user = await requireUser();

  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthAccessTokens.clientId, clientId),
        eq(oauthAccessTokens.userId, user.id),
        isNull(oauthAccessTokens.revokedAt),
      ),
    );

  await db
    .delete(oauthAuthorizationCodes)
    .where(
      and(
        eq(oauthAuthorizationCodes.clientId, clientId),
        eq(oauthAuthorizationCodes.userId, user.id),
      ),
    );

  revalidatePath("/settings/mcp");
}
