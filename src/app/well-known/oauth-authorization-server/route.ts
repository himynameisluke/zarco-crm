import { NextResponse } from "next/server";

import { OAUTH_CONSTANTS, getBaseUrl, urls } from "@/lib/oauth/config";

/**
 * RFC 8414 Authorization Server Metadata.
 * Tells MCP clients which OAuth endpoints we expose and which flows we support.
 * Served at /.well-known/oauth-authorization-server via rewrite.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  const u = urls(baseUrl);

  return NextResponse.json({
    issuer: u.issuer,
    authorization_endpoint: u.authorizationEndpoint,
    token_endpoint: u.tokenEndpoint,
    registration_endpoint: u.registrationEndpoint,
    scopes_supported: [OAUTH_CONSTANTS.SCOPE],
    response_types_supported: OAUTH_CONSTANTS.RESPONSE_TYPES,
    grant_types_supported: OAUTH_CONSTANTS.GRANT_TYPES,
    code_challenge_methods_supported: OAUTH_CONSTANTS.CODE_CHALLENGE_METHODS,
    token_endpoint_auth_methods_supported: OAUTH_CONSTANTS.TOKEN_ENDPOINT_AUTH_METHODS,
  });
}
