import { NextResponse } from "next/server";

import { getBaseUrl, urls } from "@/lib/oauth/config";

/**
 * RFC 9728 Protected Resource Metadata.
 * Tells MCP clients (Claude.ai etc.) where the authorization server lives for
 * this resource. Served at /.well-known/oauth-protected-resource via rewrite.
 */
export async function GET() {
  const baseUrl = await getBaseUrl();
  const u = urls(baseUrl);

  return NextResponse.json({
    resource: u.resource,
    authorization_servers: [u.issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
}
