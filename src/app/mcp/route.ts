import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { MCP_SERVER_INFO, registerTools } from "@/lib/mcp/server";
import { verifyBearerToken } from "@/lib/oauth/verify-token";

/**
 * The Zarco CRM MCP endpoint.
 *
 * Streamable HTTP transport, served at /mcp. mcp-handler defaults match our
 * route path (basePath ""), and we disable the legacy SSE transport since the
 * spec deprecated it in 2025-03-26.
 *
 * Auth: every request must carry a Bearer access token issued by /oauth/token.
 * withMcpAuth handles the 401 response with the WWW-Authenticate header per
 * RFC 9728; on success it attaches AuthInfo to the request and propagates it
 * into each tool's `extra.authInfo`.
 *
 * Note on session state: mcp-handler defaults to Redis (Upstash KV) for cross-
 * invocation session storage. In dev (single Node process) the in-memory
 * fallback is fine. For production on Vercel we'll wire REDIS_URL or KV_URL.
 */
const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  { serverInfo: MCP_SERVER_INFO },
  {
    disableSse: true,
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

async function verifyToken(
  _request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const verified = await verifyBearerToken(`Bearer ${bearerToken}`);
  if (!verified) return undefined;
  return {
    token: bearerToken,
    clientId: verified.clientId,
    scopes: [verified.scope],
    expiresAt: Math.floor(verified.expiresAt.getTime() / 1000),
    extra: { userId: verified.userId },
  };
}

const authedHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["mcp"],
});

export {
  authedHandler as GET,
  authedHandler as POST,
  authedHandler as DELETE,
};
