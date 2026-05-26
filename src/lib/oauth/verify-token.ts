import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthAccessTokens } from "@/lib/db/schema";
import { hashToken } from "@/lib/oauth/tokens";

export type VerifiedToken = {
  userId: string;
  clientId: string;
  scope: string;
  expiresAt: Date;
};

/**
 * Validates a Bearer token from an Authorization header.
 *
 * Returns the bound user + client if the token is live, otherwise null.
 * Side-effect: bumps last_used_at on hit. Token plaintext is never written
 * to logs or stored; only the SHA-256 hash is persisted.
 */
export async function verifyBearerToken(
  authorizationHeader: string | null,
): Promise<VerifiedToken | null> {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const plaintext = match[1].trim();
  if (!plaintext) return null;

  const tokenHash = hashToken(plaintext);

  const rows = await db
    .update(oauthAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, tokenHash),
        isNull(oauthAccessTokens.revokedAt),
        gt(oauthAccessTokens.expiresAt, new Date()),
      ),
    )
    .returning({
      userId: oauthAccessTokens.userId,
      clientId: oauthAccessTokens.clientId,
      scope: oauthAccessTokens.scope,
      expiresAt: oauthAccessTokens.expiresAt,
    });

  if (rows.length === 0) return null;
  return rows[0];
}
