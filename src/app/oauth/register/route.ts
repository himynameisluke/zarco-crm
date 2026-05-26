import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { oauthClients } from "@/lib/db/schema";
import { isValidRedirectUri } from "@/lib/oauth/validation";

/**
 * RFC 7591 Dynamic Client Registration.
 *
 * MCP clients (Claude.ai, Claude Desktop, etc.) discover this endpoint via
 * authorization-server metadata and register themselves before initiating
 * the OAuth flow. We only support public clients (no client_secret) using
 * PKCE — that's how Claude clients work in practice.
 */

const registrationSchema = z.object({
  redirect_uris: z.array(z.string()).min(1, "redirect_uris is required"),
  client_name: z.string().max(200).optional(),
  // Echoed back unmodified. Accepted for spec compliance, but we enforce the
  // grant/auth method we support regardless of what the client requests.
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});

function err(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("invalid_request", "Request body must be valid JSON");
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { redirect_uris, client_name } = parsed.data;

  for (const uri of redirect_uris) {
    if (!isValidRedirectUri(uri)) {
      return err(
        "invalid_redirect_uri",
        `redirect_uri '${uri}' is not allowed (require https or http://localhost)`,
      );
    }
  }

  const [client] = await db
    .insert(oauthClients)
    .values({
      clientName: client_name ?? "Unnamed MCP client",
      redirectUris: redirect_uris,
      grantTypes: ["authorization_code"],
      tokenEndpointAuthMethod: "none",
    })
    .returning({
      id: oauthClients.id,
      registeredAt: oauthClients.registeredAt,
    });

  return NextResponse.json(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.registeredAt.getTime() / 1000),
      client_name: client_name ?? "Unnamed MCP client",
      redirect_uris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}
