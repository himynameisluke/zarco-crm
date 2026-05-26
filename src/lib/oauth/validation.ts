/**
 * Shared validation helpers for OAuth flows.
 */

/**
 * Allowed redirect URI schemes:
 *   - https:// (any host) — production clients
 *   - http://localhost or http://127.0.0.1 (any port) — local dev clients
 *
 * No wildcards. Loopback exception per RFC 8252 §7.3.
 */
export function isValidRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }

  if (parsed.hash) return false; // No fragments per RFC 6749 §3.1.2

  if (parsed.protocol === "https:") return true;

  if (
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    return true;
  }

  return false;
}

/**
 * Constant-time string comparison. Use whenever we compare secrets or
 * one-shot codes to avoid timing side-channels.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
