import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Extracts the bound user id from the MCP request's auth context.
 *
 * The auth bridge in /mcp/route.ts stores the verified Zarco user id in
 * AuthInfo.extra.userId. Every tool that touches the DB calls this helper
 * so attribution and (future) scoping happen in one place.
 */
export type McpAuthContext = {
  userId: string;
  clientId: string;
};

export function getMcpContext(authInfo: AuthInfo | undefined): McpAuthContext {
  if (!authInfo) {
    throw new Error("MCP request reached a tool without auth info");
  }
  const userId = (authInfo.extra as Record<string, unknown> | undefined)?.userId;
  if (typeof userId !== "string") {
    throw new Error("MCP auth info missing userId");
  }
  return {
    userId,
    clientId: authInfo.clientId,
  };
}

/**
 * Standard text content wrapper. Tools call `textResult(payload)` to return
 * JSON-formatted output that Claude reads back.
 */
export function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}
