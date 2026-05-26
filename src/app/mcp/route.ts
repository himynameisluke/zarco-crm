import { NextResponse, type NextRequest } from "next/server";

import { getBaseUrl } from "@/lib/oauth/config";
import { verifyBearerToken } from "@/lib/oauth/verify-token";

/**
 * MCP endpoint stub.
 *
 * Phase A (this branch): proves OAuth end-to-end. Validates the bearer
 * token and returns a placeholder response that identifies the bound user.
 * No tools yet.
 *
 * Phase B (next branch): wire up @modelcontextprotocol/sdk with the
 * Streamable HTTP transport and start exposing tools.
 *
 * Per RFC 9728, on 401 we return WWW-Authenticate pointing at our
 * resource metadata so MCP clients can auto-discover the authorization
 * server.
 */

async function unauthorized(reason: string) {
  const baseUrl = await getBaseUrl();
  return NextResponse.json(
    { error: "unauthorized", error_description: reason },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handle(request: NextRequest) {
  const token = await verifyBearerToken(request.headers.get("authorization"));
  if (!token) return unauthorized("Missing or invalid access token");

  // Placeholder until phase B drops in the MCP SDK.
  return NextResponse.json(
    {
      status: "auth_ok",
      message: "OAuth verified. Tool surface ships in phase B.",
      bound_to: {
        user_id: token.userId,
        client_id: token.clientId,
        scope: token.scope,
        expires_at: token.expiresAt.toISOString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
