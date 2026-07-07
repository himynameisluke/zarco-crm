# Handoff — Zarco CRM

**Date:** 2026-07-07
**Branch:** `main`, pushed through `e89573a`. Working tree clean (except this file + `.claude/`).
**Status:** Audit-fix session COMPLETE and deployed. Full findings + statuses: `docs/audit-2026-07-07.md`.

---

## What happened on 2026-07-07

One session took the repo from "uncommitted MCP security fix, unverified" to
all of the below **committed, built green, and pushed to main** (auto-deploys
via Vercel):

1. `4fd5a99` — the MCP workspace-scoping security fix (tsc verified, audit-confirmed complete)
2. `a42a303` — web-layer security batch: OAuth-client IDOR, web FK injection, quote public-token gating, internal-PDF workspace scoping
3. `b879a39` — schema: `contracts` table, `deals.lost_reason` + `stage_changed_at`, `workspaces.quote_counter` (migration **0005 — APPLIED to the live DB**)
4. `2de8e26` — ownership surfaced (owner select/display/filter, My deals) + stage history + won/lost/quote/task lifecycle side effects
5. `3f1eb50` — correctness: atomic per-workspace quote numbers (migration **0006 — APPLIED**), transactions everywhere, status guards, sign-up workspace bootstrap, contact→org link, orphan cleanup on delete
6. `fe4ef1a` — renewals: /renewals view, contract form, renewal-deal spawn, "Track as contract", MCP contract tools (server 0.6.0)
7. `e34121f` + `e89573a` — dead-UI sweep: real search/pagination/CSV-export/row-menus, live sidebar counts, palette reach, detail-page owner/org/deal links

**Both migrations (0005, 0006) are already applied** to the Supabase DB via
`drizzle-kit migrate` (generate+migrate works; `db:push` is the flaky one).

## Verification state

- `tsc --noEmit` green + `pnpm build` green at every push.
- Live MCP + browser verification of the deployed app was in progress at
  handoff time — see the session summary / memory for what got exercised.

## Top remaining work (full list in docs/audit-2026-07-07.md §6)

1. **MCP prod session store** — wire `REDIS_URL`/`KV_URL` (in-memory fallback
   today) + tighten db pool (`max:10`, no timeouts — Supabase pooler risk).
2. **Lead lifecycle fields** on contacts (lifecycle stage, status, source).
3. **Reporting page** — funnel/velocity/forecast; the data (stage history,
   lost reasons, close dates) now exists.
4. **Suppression list before Resend** — there is no unsubscribe mechanism;
   legally required (UK GDPR/PECR) before real email sends.
5. CSV import; RFC 7009 token revoke + OAuth rate limiting; MCP per-request
   workspace selection (still binds to the user's primary workspace).

## Standing gotchas

- Drizzle connects as the Postgres role → **RLS is bypassed; app-layer
  workspaceId filtering is the ONLY tenant boundary.** Every new query must
  scope by workspace; every FK from user input goes through
  `entityInWorkspace` (`src/lib/mcp/scope.ts` — used by web actions too).
- Route handlers do NOT inherit the (app) layout's auth — check auth +
  workspace in every new route.ts (see the export/PDF routes for the pattern).
- `quote_number` is unique per workspace; numbers come ONLY from
  `nextQuoteNumber` (`src/lib/quotes/number.ts`).
- Stage changes go through `stageTransitionValues`/`logStageChange`
  (`src/lib/deals/stage.ts`) — don't write `deals.stage` directly.
- lucide-react's `Eye` icon is broken in the pinned version (no exports) —
  don't import it.
