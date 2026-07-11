import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthAuthorizationCodes, oauthAccessTokens } from "@/lib/db/schema";
import { OAUTH_CONSTANTS } from "@/lib/oauth/config";
import { generateAccessToken, verifyPkceS256 } from "@/lib/oauth/tokens";
import { timingSafeEqual } from "@/lib/oauth/validation";

/**
 * RFC 6749 §4.1.3 + RFC 7636 (PKCE) token endpoint.
 *
 * Exchanges an authorization code for an access token. Codes are single-use
 * (enforced atomically via UPDATE ... WHERE consumed_at IS NULL) and short-
 * lived (10 minutes). PKCE S256 is mandatory.
 */

function err(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    {
      status,
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    },
  );
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return err(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded",
    );
  }

  const form = await request.formData();
  const grantType = form.get("grant_type");
  const code = form.get("code");
  const redirectUri = form.get("redirect_uri");
  const clientId = form.get("client_id");
  const codeVerifier = form.get("code_verifier");

  if (grantType !== "authorization_code") {
    return err("unsupported_grant_type", "Only authorization_code is supported");
  }

  if (
    typeof code !== "string" ||
    typeof redirectUri !== "string" ||
    typeof clientId !== "string" ||
    typeof codeVerifier !== "string"
  ) {
    return err(
      "invalid_request",
      "code, redirect_uri, client_id, and code_verifier are required",
    );
  }

  // Atomic single-use consumption: UPDATE only succeeds the first time.
  const consumed = await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthAuthorizationCodes.code, code),
        isNull(oauthAuthorizationCodes.consumedAt),
      ),
    )
    .returning();

  if (consumed.length === 0) {
    return err("invalid_grant", "Authorization code is invalid or already used");
  }

  const stored = consumed[0];

  if (stored.expiresAt.getTime() < Date.now()) {
    return err("invalid_grant", "Authorization code has expired");
  }

  if (!timingSafeEqual(stored.clientId, clientId)) {
    return err("invalid_grant", "client_id does not match the authorization code");
  }

  if (!timingSafeEqual(stored.redirectUri, redirectUri)) {
    return err(
      "invalid_grant",
      "redirect_uri does not match the authorization request",
    );
  }

  if (!verifyPkceS256(codeVerifier, stored.codeChallenge)) {
    return err("invalid_grant", "PKCE verification failed");
  }

  const token = generateAccessToken();
  const expiresAt = new Date(Date.now() + OAUTH_CONSTANTS.TOKEN_TTL_SECONDS * 1000);

  await db.insert(oauthAccessTokens).values({
    tokenHash: token.hash,
    clientId: stored.clientId,
    userId: stored.userId,
    scope: stored.scope,
    // Workspace binding rides the code → token → every MCP call (see schema).
    workspaceId: stored.workspaceId,
    expiresAt,
  });

  return NextResponse.json(
    {
      access_token: token.plaintext,
      token_type: "Bearer",
      expires_in: OAUTH_CONSTANTS.TOKEN_TTL_SECONDS,
      scope: stored.scope,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    },
  );
}
