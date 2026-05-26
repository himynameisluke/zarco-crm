import { createHash, randomBytes } from "node:crypto";

/**
 * Generates a 256-bit access token, base64url-encoded.
 *
 * Returns both the plaintext (to send to the client once) and its SHA-256
 * hash (to store in the DB). We never persist the plaintext — token lookups
 * hash the incoming bearer and compare to the stored hash.
 */
export function generateAccessToken(): { plaintext: string; hash: string } {
  const bytes = randomBytes(32);
  const plaintext = bytes.toString("base64url");
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * PKCE S256 verification (RFC 7636 §4.6).
 * The challenge stored at /authorize must equal base64url(SHA-256(verifier))
 * sent at /token.
 */
export function verifyPkceS256(verifier: string, storedChallenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  // Length-equal short strings, but use constant-time anyway.
  if (computed.length !== storedChallenge.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedChallenge.charCodeAt(i);
  }
  return diff === 0;
}
