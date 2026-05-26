import { headers } from "next/headers";

export const OAUTH_CONSTANTS = {
  SCOPE: "mcp",
  CODE_TTL_SECONDS: 10 * 60, // 10 minutes
  TOKEN_TTL_SECONDS: 90 * 24 * 60 * 60, // 90 days
  CODE_CHALLENGE_METHODS: ["S256"] as const,
  GRANT_TYPES: ["authorization_code"] as const,
  RESPONSE_TYPES: ["code"] as const,
  TOKEN_ENDPOINT_AUTH_METHODS: ["none"] as const,
} as const;

/**
 * Resolves the externally-visible base URL of this deployment from request
 * headers. In dev this is http://localhost:3000; in production it's
 * https://crm.zarco.uk (or whatever Vercel set). We use this in OAuth
 * metadata + redirect responses so the issued endpoints actually resolve.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  if (!forwardedHost) {
    throw new Error("Cannot resolve base URL: missing Host header");
  }
  const proto =
    forwardedProto ?? (forwardedHost.startsWith("localhost") ? "http" : "https");
  return `${proto}://${forwardedHost}`;
}

export function urls(baseUrl: string) {
  return {
    issuer: baseUrl,
    resource: `${baseUrl}/mcp`,
    authorizationEndpoint: `${baseUrl}/oauth/authorize`,
    tokenEndpoint: `${baseUrl}/oauth/token`,
    registrationEndpoint: `${baseUrl}/oauth/register`,
  };
}
