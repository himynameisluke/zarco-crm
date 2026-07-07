# Handoff — Zarco CRM

**Date:** 2026-07-08 (end of a long 2026-07-07→08 session)
**Branch:** `main`, all work pushed. Working tree clean (except `.claude/`).
**Prod:** https://zarco-crm.vercel.app — pushing to `main` auto-deploys via Vercel.
**Posture:** INTERNAL-ONLY tool for Zarco (not sold to customers). Solo/small, retainer-heavy consultancy. The CRM is agent-operated via its `/mcp` server (the connected "Zarco CRM" MCP tool family IS this app).

---

## PICKUP — read this first

Everything below is **shipped, deployed, and verified live**. There is no half-finished work in the tree. Two reference docs in the repo:
- `docs/audit-2026-07-07.md` — the full code audit + every finding's status.
- `docs/superpowers/specs/2026-07-07-reporting-page-design.md` + `docs/superpowers/plans/2026-07-07-reporting-page.md` — the reporting feature's spec + plan.

**To resume: pick a thread from "Next work" below.** Nothing is blocking.

**Before any code change, read "Standing gotchas" — several are non-obvious and will bite.**

---

## What shipped this session (all on `main`, deployed, verified)

**Security** (`docs/audit-2026-07-07.md` has the detail; recalibrated to defense-in-depth given internal-only, but all fixed):
- MCP tools workspace-scoped (was cross-tenant read/write/delete via any token).
- Web-layer holes closed: OAuth-client IDOR (`revokeOAuthClient` now scoped to caller), web-action FK injection (all FKs validated via `entityInWorkspace`), quote public-token gating (drafts hidden on viewer+PDF, `validUntil` enforced/auto-expire, internal PDF workspace-scoped).

**Correctness:**
- Atomic per-workspace quote numbers (`src/lib/quotes/number.ts` + `workspaces.quote_counter`) — killed the count(*)+1 collision-after-delete bug.
- Transactions on every multi-write (there were ZERO before): quote/campaign/inbox-triage/deletes.
- Draft-only guards on `updateQuote` / `markQuoteSent` / `sendCampaignStub`.
- Sign-up now bootstraps a workspace (new accounts used to hit "No current workspace" everywhere).
- Contact→org link finally in the contact form; orphan cleanup (polymorphic activities/tasks) on every delete (web + MCP).
- `toggleTaskDone` reads the row server-side; task quick-add rejects unparseable dates.

**Features:**
- **Ownership** — owner select/display on deals+contacts+orgs, My/All-deals filter (columns existed but were write-only).
- **Renewals** — `contracts` table, `/renewals` (due-≤90d / active / past, annualised book value), one-click "Create renewal deal", "Track as contract" on won deals, MCP `list/create/update_contract` (server 0.6.0).
- **Stage history** — `deals.stageChangedAt` + `lostReason`; shared `stageTransitionValues`/`logStageChange` (web + MCP) stamp closeDate, record lost reason, log `status_change`. Quote (`quote_sent/viewed/accepted`) + `task_completed` lifecycle activities now actually written.
- **Reporting** — `/reports`: revenue forecast, win/loss + lost-reason buckets, pipeline funnel (snapshot), recurring revenue, with a 3m/6m/12m toggle. First tests in the repo → **vitest added** (`pnpm test`, 35 unit tests). Architecture = pure-core/io-shell (see gotchas).
- **Dead-UI sweep** — real server search + pagination + CSV export + row ⋯ menus on the list views; live sidebar "pinned view" counts; command-palette reach 30→300.
- **C17** — forms preserve input on a validation error (`src/lib/use-action-form.ts`; React 19 was auto-resetting them).

**Migrations (both APPLIED to the live Supabase DB via `drizzle-kit migrate`):**
- `0005` — contracts table + `deals.lost_reason`/`stage_changed_at` + `workspaces.quote_counter`.
- `0006` — `quote_number` now unique PER-workspace (was global).

**Non-issue investigated + closed:** the "Console lost the real pipeline" alarm was a **misdiagnosis** — the Console MCP token (same user as everything) correctly binds to the real "Zarco" workspace and sees CyberSmart £425k etc. The deals it "lost" were **Demo-workspace seed fixtures** (Meridian £22k / Bellweather £18k / Silverkiln £6.5k). Scoping is working as intended. No fix; re-run the paused Sales mission against the real workspace.

---

## Next work (roadmap, ranked by leverage for Zarco)

1. **Automatic data capture — highest leverage.** Everything is manual entry today, so the CRM decays and starves the agents of current data. Scaffolding already exists (Integrations page has Outlook + Granola cards; inbox-triage flow is built and waiting):
   - **Email sync (Microsoft Graph)** → threads into the activity timeline, unrouted mail into the inbox.
   - **Meeting transcripts (Granola webhook → inbox)** — inbox already has a sample-transcript flow; only the real webhook is missing.
2. **Resend + suppression/unsubscribe.** Campaigns/quotes/`send_email` are all stubbed. Wiring Resend unlocks real outbound — but there is NO suppression/unsubscribe list and you mail real prospects, so **UK GDPR/PECR requires it first**. Ship as one unit.
3. **Lead source + lifecycle fields on contacts.** No attribution today. Cheap schema+form change; feeds the new /reports page ("where do clients come from").
4. **Table-stakes:** CSV import (export exists), duplicate detection, **Projects MCP tools** (agents can't touch projects), infra hardening (MCP `REDIS_URL`/`KV_URL` session store — in-memory on Vercel today; DB pool `max:10`/no-timeouts — Supabase pooler risk), kanban drag-drop, task priority/reminders, custom fields, RFC 7009 token revoke + OAuth rate limiting, MCP per-request workspace selection.

Reporting follow-ups noted in its spec: NRR omitted (needs a revenue-history snapshot); the /reports empty-state keys on deal-count (a contracts-but-no-deals workspace would hide the recurring card); lost reasons are keyword-normalised free text (a fixed dropdown at mark-lost would make them exact).

---

## Standing gotchas (READ before coding)

- **RLS is bypassed** (Drizzle connects as the Postgres role) → **app-layer `workspaceId` filtering is the ONLY tenant boundary.** Every query scopes by workspace; every user-supplied FK goes through `entityInWorkspace` (`src/lib/mcp/scope.ts`, used by web actions too).
- **Route handlers do NOT inherit the `(app)` layout's auth** — check auth + workspace inside every `route.ts` (see the export/PDF routes for the pattern).
- **Write `deals.stage` ONLY via `stageTransitionValues`/`logStageChange`** (`src/lib/deals/stage.ts`) — never set the column directly, or you skip closeDate/lostReason/activity side effects.
- **Quote numbers ONLY via `nextQuoteNumber`** (`src/lib/quotes/number.ts`); `quote_number` is unique per workspace.
- **Forms use the `useActionForm` hook** (`src/lib/use-action-form.ts`, onSubmit-based) so React 19 doesn't wipe input on a validation error. Don't revert create/edit forms to `<form action={formAction}>`. Inline composers (activity/task/triage) intentionally stay on the old pattern (they clear on success).
- **Reports = pure-core/io-shell.** `src/lib/reports/{forecast,win-loss,funnel,recurring,lost-reason,dates}.ts` are PURE (no `server-only`, no `@/lib/db`) so vitest can import them; ALL DB access is isolated in `src/lib/reports/queries.ts`. Keep it that way or the tests break.
- **`STAGE_WEIGHTS`** lives in `src/lib/deals/weights.ts` (shared by dashboard + forecast) — one source of truth; don't re-inline it.
- **lucide `Eye` icon is broken** in the pinned version (no exports) — do not import it. `BarChart3` etc. are fine.
- **`pnpm db:push` is flaky** (drizzle-kit/Node 25) — use `pnpm db:generate` then `pnpm db:migrate`. For hand-applied SQL, source `.env.local` and use a direct `postgres.js` script.
- **ESLint CLI is broken in this environment** (a `@typescript-eslint` plugin version mismatch — `createRule is not a function`). Rely on `tsc --noEmit` + `pnpm build` as the gates; don't block on `eslint`.
- **MCP binds to the user's primary (earliest-created) workspace** = "Zarco" (real). The "Demo workspace" is seed data. Per-request workspace selection is a backlog item, not a bug.

---

## Commands / stack

- Stack: Next.js 16 (App Router, Turbopack) · Supabase Postgres · Drizzle · Tailwind 4 + shadcn (base-nova) · Vercel · pnpm. Node 25.
- Verify: `pnpm test` (35 unit tests) · `node_modules/.bin/tsc --noEmit -p tsconfig.json` (slow, ~1–2 min — run once, don't parallel) · `pnpm build`.
- DB: migrations in `drizzle/`; `.env.local` holds `DATABASE_URL`. Live is on Supabase (London / lhr1 to match Vercel functions).
- Auth: Supabase Auth (web) + full OAuth 2.1 server for MCP (`src/app/oauth/*`, `src/app/mcp/route.ts`).
- Pushing to `main` auto-deploys. Deploys take ~2 min.
