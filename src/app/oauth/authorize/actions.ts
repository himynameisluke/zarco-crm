"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { oauthAuthorizationCodes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import { OAUTH_CONSTANTS } from "@/lib/oauth/config";
import {
  buildErrorRedirect,
  validateAuthorizeRequest,
} from "@/lib/oauth/authorize-request";

/**
 * Handles the consent form submission.
 *
 * The form re-submits the full set of OAuth params as hidden fields so we
 * re-validate the request (defending against tampering between page load
 * and submission) before issuing a code.
 */
export async function decideConsent(formData: FormData) {
  const user = await requireUser();

  const decision = formData.get("decision");

  const params = new URLSearchParams();
  for (const key of [
    "client_id",
    "redirect_uri",
    "response_type",
    "code_challenge",
    "code_challenge_method",
    "scope",
    "state",
    "resource",
  ]) {
    const value = formData.get(key);
    if (typeof value === "string") params.set(key, value);
  }

  const result = await validateAuthorizeRequest(params);

  if (result.kind === "client_error") {
    // We can't trust the redirect_uri here — fail visibly.
    throw new Error(`OAuth error: ${result.error} (${result.description})`);
  }

  if (result.kind === "redirect_error") {
    redirect(
      buildErrorRedirect(
        result.redirectUri,
        result.error,
        result.description,
        result.state,
      ),
    );
  }

  const req = result.request;

  if (decision !== "allow") {
    redirect(
      buildErrorRedirect(
        req.redirectUri,
        "access_denied",
        "The user denied the request",
        req.state,
      ),
    );
  }

  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + OAUTH_CONSTANTS.CODE_TTL_SECONDS * 1000);

  // Bind the grant to the workspace the user is acting in RIGHT NOW (cookie +
  // membership verified server-side — never a form field, so it can't be
  // tampered). The consent page shows this workspace by name; MCP calls made
  // with the resulting token land in these books. Null (no workspace) keeps
  // the legacy primary-workspace fallback.
  const workspace = await getCurrentWorkspace();

  await db.insert(oauthAuthorizationCodes).values({
    code,
    clientId: req.client.id,
    userId: user.id,
    redirectUri: req.redirectUri,
    codeChallenge: req.codeChallenge,
    codeChallengeMethod: req.codeChallengeMethod,
    scope: req.scope,
    resource: req.resource,
    workspaceId: workspace?.id ?? null,
    expiresAt,
  });

  const successUrl = new URL(req.redirectUri);
  successUrl.searchParams.set("code", code);
  if (req.state) successUrl.searchParams.set("state", req.state);
  redirect(successUrl.toString());
}
