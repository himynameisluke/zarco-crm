# OAuth 2.1 + MCP Authorization

This document describes the OAuth implementation that lives on the
`feat/mcp-oauth` branch and is intended for review before merging to main.

## What this branch adds

A standards-based OAuth 2.1 authorization server bolted onto our existing
Supabase Auth, so MCP clients (Claude.ai web, Claude Desktop, Claude Code,
custom agents) can sign in as a Zarco user and access the CRM via tools.

Phase A (this branch) only does **auth** — the `/mcp` endpoint returns a
placeholder. Phase B will drop in `@modelcontextprotocol/sdk` and the
tool surface (separate branch).

## The flow

```
Claude.ai                            Zarco CRM                       Supabase
─────────                            ─────────                       ────────

  1. GET .well-known/oauth-protected-resource
                       ──────────────────────►
                       ◄──────── { authorization_servers: [...] }

  2. POST /oauth/register
                       ──────────────────────►   create oauth_clients row
                       ◄──────── { client_id }

  3. open /oauth/authorize?client_id=...&code_challenge=...
                       ──────────────────────►
                                              ┌─ no session?
                                              │  ──► /login?next=...
                                              │             ──► OTP email ──►
                                              │     user clicks magic link
                                              │  ◄── /auth/callback ────────
                                              │       session set
                                              ▼
                                              show consent screen
                                              user clicks "Allow"
                                              insert oauth_authorization_codes
                       ◄──────── 302 redirect_uri?code=...&state=...

  4. POST /oauth/token (form-encoded: code, code_verifier, ...)
                       ──────────────────────►   verify PKCE
                                              mark code consumed (atomic)
                                              insert oauth_access_tokens
                                                (stores SHA-256(token))
                       ◄──────── { access_token, expires_in: 7776000 }

  5. POST /mcp   Authorization: Bearer <access_token>
                       ──────────────────────►   hash + look up token
                                              load user, dispatch
                       ◄──────── MCP response
```

## Files to review

In rough order of how much trust the file carries:

| File | What it does | Watch for |
|---|---|---|
| [src/lib/oauth/tokens.ts](../src/lib/oauth/tokens.ts) | Generates access tokens; hashes for storage; verifies PKCE S256 | Constant-time comparison, no plaintext logging |
| [src/lib/oauth/verify-token.ts](../src/lib/oauth/verify-token.ts) | Bearer token validation on `/mcp` | Single SQL UPDATE-and-return, expiry + revocation checks in the WHERE clause |
| [src/lib/oauth/authorize-request.ts](../src/lib/oauth/authorize-request.ts) | Validates `/oauth/authorize` params; two-phase (client-error vs redirect-error) | Pre-validation of `client_id` + `redirect_uri` BEFORE trusting any redirect |
| [src/lib/oauth/validation.ts](../src/lib/oauth/validation.ts) | Redirect URI allowlist, constant-time compare | HTTPS required except loopback (RFC 8252 §7.3) |
| [src/app/oauth/token/route.ts](../src/app/oauth/token/route.ts) | `POST /oauth/token` | Atomic single-use via `UPDATE ... WHERE consumed_at IS NULL` returning rows |
| [src/app/oauth/authorize/page.tsx](../src/app/oauth/authorize/page.tsx) | `/oauth/authorize` page | Validation happens server-side, before any session check |
| [src/app/oauth/authorize/actions.ts](../src/app/oauth/authorize/actions.ts) | Consent form submission → issues code | Re-validates from form data (defends against tampered hidden fields) |
| [src/app/oauth/register/route.ts](../src/app/oauth/register/route.ts) | `POST /oauth/register` (RFC 7591) | redirect_uri validated before insert; public clients only |
| [src/app/mcp/route.ts](../src/app/mcp/route.ts) | MCP endpoint stub | 401 response includes `WWW-Authenticate` with resource_metadata |

## Security properties (what we enforce)

| Property | Where |
|---|---|
| **PKCE S256 required** | `authorize-request.ts` rejects other methods; `tokens.ts` `verifyPkceS256` |
| **Single-use authorization codes** | `token/route.ts` uses `UPDATE ... WHERE consumed_at IS NULL` and checks `rowsAffected` |
| **10-minute code TTL** | `OAUTH_CONSTANTS.CODE_TTL_SECONDS`; checked at exchange |
| **No client_secret leakage** | Public clients only (`token_endpoint_auth_method=none`); secrets aren't issued |
| **Tokens stored as SHA-256 hashes** | `tokens.ts` `generateAccessToken` returns plaintext + hash; only hash persisted |
| **Constant-time compares** | `validation.ts` `timingSafeEqual`; PKCE verify; client_id/redirect_uri compares in token endpoint |
| **Redirect URI strict match** | Exact-string match against registered URIs (no path-prefix, no wildcards) |
| **Loopback exception per RFC 8252** | http://localhost or http://127.0.0.1 allowed; everything else must be https |
| **Phase-aware error reporting** | Client/redirect errors stay local; post-validation errors redirect with `error=` |
| **No-store on token responses** | `Cache-Control: no-store, Pragma: no-cache` on /oauth/token and /mcp |
| **OAuth tables locked via RLS** | `supabase/policies.sql` enables RLS with no policies — only the Drizzle (postgres role) connection can read |
| **Open-redirect safe `next` param** | Login + callback check `startsWith('/')` and reject `//` (protocol-relative) |
| **RFC 9728 WWW-Authenticate on 401** | `/mcp` returns `Bearer resource_metadata="..."` so clients self-discover |

## Out of scope (intentionally)

- **Refresh tokens.** Access tokens are 90 days. Acceptable for personal use; we'll add refresh + rotation when the token TTL bites someone.
- **Token revocation endpoint** (RFC 7009). Manual SQL `UPDATE oauth_access_tokens SET revoked_at = now() WHERE ...` if needed.
- **Scopes beyond `mcp`.** Single coarse scope. Fine-grained scopes (read-only, etc.) come when there's a need.
- **Confidential clients with client_secret.** Public clients only. Claude clients are public anyway.
- **JWT access tokens.** Opaque tokens, DB lookup per request. Adds ~5ms per `/mcp` call. Will revisit if traffic ever justifies signed tokens.
- **Rate limiting.** Vercel's defaults are the floor. Add explicit limits if abused.

## Review checklist

Walk through these scenarios on the running app:

- [ ] **Discovery works.** `curl /.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` return valid JSON
- [ ] **Registration with bad redirect_uri rejected.** POST `/oauth/register` with `redirect_uris: ["http://example.com/cb"]` → 400 (http for non-loopback)
- [ ] **Registration with good URI succeeds.** Returns `client_id`
- [ ] **/oauth/authorize with unknown client_id** shows local error page (not a redirect)
- [ ] **/oauth/authorize with valid client but bad redirect_uri** shows local error page
- [ ] **/oauth/authorize with no PKCE** redirects to client with `error=invalid_request`
- [ ] **/oauth/authorize when signed out** redirects to `/login?next=...`
- [ ] **After login, /oauth/authorize resumes** to the consent screen
- [ ] **"Deny" redirects with `error=access_denied`**
- [ ] **"Allow" redirects with `code=...&state=...`**
- [ ] **POST /oauth/token with wrong code_verifier** → `invalid_grant`
- [ ] **POST /oauth/token re-using a consumed code** → `invalid_grant`
- [ ] **POST /oauth/token with expired code** → `invalid_grant`
- [ ] **GET /mcp without bearer** → 401 with `WWW-Authenticate` header
- [ ] **GET /mcp with valid bearer** → 200 with `auth_ok` placeholder + bound user id

## Trying it locally

1. Apply the new schema:
   ```sh
   pnpm db:generate && pnpm db:migrate
   ```
2. Re-apply RLS (the file now covers the OAuth tables):
   paste `supabase/policies.sql` into the Supabase SQL editor
3. Boot:
   ```sh
   pnpm dev
   ```
4. Register a test client:
   ```sh
   curl -X POST http://localhost:3000/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name":"Local test","redirect_uris":["http://localhost:8765/cb"]}'
   ```
5. Open the authorize URL in a browser (PKCE values for testing only):
   ```
   http://localhost:3000/oauth/authorize?
     response_type=code&
     client_id=<from-step-4>&
     redirect_uri=http://localhost:8765/cb&
     code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
     code_challenge_method=S256&
     scope=mcp&
     state=xyz
   ```
   The matching verifier is `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`.
6. Sign in, click Allow. You'll be redirected to `http://localhost:8765/cb?code=...` (the callback won't load — that's fine, just grab the `code` from the URL bar).
7. Exchange the code:
   ```sh
   curl -X POST http://localhost:3000/oauth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=<from-step-6>&redirect_uri=http://localhost:8765/cb&client_id=<from-step-4>&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   ```
8. Hit `/mcp` with the token:
   ```sh
   curl http://localhost:3000/mcp -H "Authorization: Bearer <access_token>"
   ```
   Expect `{"status":"auth_ok", "bound_to": {...}}`.
