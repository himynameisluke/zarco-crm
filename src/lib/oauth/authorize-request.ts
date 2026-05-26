import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthClients } from "@/lib/db/schema";
import { OAUTH_CONSTANTS } from "@/lib/oauth/config";

export type AuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state: string | null;
  resource: string | null;
};

export type ValidatedAuthorizeRequest = AuthorizeRequest & {
  client: {
    id: string;
    clientName: string;
    redirectUris: string[];
  };
};

/**
 * Two-phase validation result.
 *
 * `client_error` means we can't trust the redirect_uri — the user-agent
 * sees a local error page. `redirect_error` means we validated client +
 * redirect_uri, so subsequent errors are reported back to the client by
 * redirecting to `redirect_uri?error=...&state=...` per RFC 6749 §4.1.2.1.
 */
export type AuthorizeValidationResult =
  | { kind: "ok"; request: ValidatedAuthorizeRequest }
  | {
      kind: "client_error";
      error: string;
      description: string;
    }
  | {
      kind: "redirect_error";
      redirectUri: string;
      state: string | null;
      error: string;
      description: string;
    };

function readParams(searchParams: URLSearchParams): AuthorizeRequest {
  return {
    clientId: searchParams.get("client_id") ?? "",
    redirectUri: searchParams.get("redirect_uri") ?? "",
    responseType: searchParams.get("response_type") ?? "",
    codeChallenge: searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: searchParams.get("code_challenge_method") ?? "",
    scope: searchParams.get("scope") ?? OAUTH_CONSTANTS.SCOPE,
    state: searchParams.get("state"),
    resource: searchParams.get("resource"),
  };
}

export async function validateAuthorizeRequest(
  searchParams: URLSearchParams,
): Promise<AuthorizeValidationResult> {
  const req = readParams(searchParams);

  // -- Phase 1: validate client + redirect_uri (errors stay local) ------------

  if (!req.clientId) {
    return {
      kind: "client_error",
      error: "invalid_request",
      description: "Missing client_id",
    };
  }

  if (!req.redirectUri) {
    return {
      kind: "client_error",
      error: "invalid_request",
      description: "Missing redirect_uri",
    };
  }

  const [client] = await db
    .select({
      id: oauthClients.id,
      clientName: oauthClients.clientName,
      redirectUris: oauthClients.redirectUris,
    })
    .from(oauthClients)
    .where(eq(oauthClients.id, req.clientId))
    .limit(1);

  if (!client) {
    return {
      kind: "client_error",
      error: "invalid_client",
      description: "Unknown client_id",
    };
  }

  if (!client.redirectUris.includes(req.redirectUri)) {
    return {
      kind: "client_error",
      error: "invalid_redirect_uri",
      description: "redirect_uri does not match a registered URI",
    };
  }

  // -- Phase 2: validate the rest (errors redirect back to client) -----------

  if (req.responseType !== "code") {
    return {
      kind: "redirect_error",
      redirectUri: req.redirectUri,
      state: req.state,
      error: "unsupported_response_type",
      description: "Only response_type=code is supported",
    };
  }

  if (!req.codeChallenge || req.codeChallengeMethod !== "S256") {
    return {
      kind: "redirect_error",
      redirectUri: req.redirectUri,
      state: req.state,
      error: "invalid_request",
      description: "PKCE required: code_challenge_method must be S256",
    };
  }

  if (req.scope !== OAUTH_CONSTANTS.SCOPE) {
    return {
      kind: "redirect_error",
      redirectUri: req.redirectUri,
      state: req.state,
      error: "invalid_scope",
      description: `Only scope=${OAUTH_CONSTANTS.SCOPE} is supported`,
    };
  }

  return {
    kind: "ok",
    request: { ...req, client },
  };
}

export function buildErrorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state: string | null,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}
