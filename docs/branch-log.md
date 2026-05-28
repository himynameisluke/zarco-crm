# Branch log

Running log of every feature branch built on this project. Maintained so it's
easy to see the size and pace of changes at a glance.

**Convention:** a new entry is added every time a feature branch is created,
updated as commits land on that branch, and finalised when the branch is
pushed. Stats are `git diff --shortstat <parent>..<branch>` against the
branch's parent (the linear stack means each branch's parent is the previous
one, not main).

| Date | Branch | Files | Insertions | Deletions | Commits | What |
|---|---|---|---|---|---|---|
| 2026-05-26 | `feat/mcp-oauth` | 21 | +1,247 | -45 | 1 | OAuth 2.1 server + PKCE + dynamic client registration (Phase A of MCP) |
| 2026-05-26 | `feat/mcp-tools` | 10 | +960 | -49 | 1 | Real MCP server + 8 read tools (Phase B of MCP) |
| 2026-05-26 | `feat/orgs-deals-ui` | 27 | +3,992 | -94 | 4 | Organizations + Deals (kanban) modules; hydration fix on asChild Triggers |
| 2026-05-26 | `feat/design-foundation` | 25 | +4,509 | -148 | 1 | Design system tokens, fonts, dark theme; shell + sidebar + topbar rebuilt; bundles design source under `docs/design/` |
| 2026-05-26 | `feat/design-pages` | 22 | +1,247 | -423 | 1 | Restyled Contacts list, Orgs list, Deals kanban + per-page Topbar pattern |
| 2026-05-26 | `feat/design-new-screens` | 8 | +1,851 | -21 | 1 | New Dashboard at `/`, real Tasks module, Activity feed |
| 2026-05-26 | `feat/mcp-writes` | 12 | +2,503 | -9 | 1 | 8 MCP write tools + `mcp` enum value + audit-trail helper (Phase C of MCP) |
| 2026-05-26 | `feat/projects-campaigns-polish` | 23 | +1,831 | -5 | 1 | Projects module, ⌘K command palette, `/settings/mcp`, activity composer |
| 2026-05-26 | `feat/inbox-v1` | 10 | +2,894 | -11 | 1 | Inbox processing queue (`inbox_items` schema + triage UI + sidebar count) |
| 2026-05-26 | `feat/quotes-builder` | 12 | +1,890 | -9 | 1 | Quote builder with live totals + public client view at `/q/[token]` |
| 2026-05-26 | `feat/campaigns-and-high-stakes` | 13 | +1,593 | -9 | 1 | Campaigns module (draft mode, no Resend); MCP delete_* + send_* (stubbed) with confirm-required gating; Outlook/Resend/Granola placeholder cards on /settings/mcp |
| 2026-05-26 | `feat/vercel-deploy` | 4 | +198 | 0 | 1 | Deploy hand-off: vercel.json (60s maxDuration on /mcp), expanded .env.example (REDIS_URL + future-integration vars), docs/DEPLOY.md with step-by-step, fix .gitignore to track .env.example |
| 2026-05-27 | `fix/bug-bash` | 2 | +88 | -16 | 1 | Fix mobile sidebar drawer rendering only top 47px — Topbar's `backdrop-filter` was creating a containing block for fixed-positioned descendants, so the drawer sized to topbar (920×47) instead of viewport. Portaled the drawer to `document.body` to escape. Also tightened desktop sidebar wrapper with explicit width + flex-shrink:0. |
| 2026-05-27 | `feat/password-auth` | 4 | +126 | -27 | 1 | Switch sign-in from magic-link OTP to email + password (signInWithPassword + signUp). Magic-link redirect URL was a mess across local/Vercel/custom-domain environments; password auth keeps everything in-app. |
| 2026-05-27 | `feat/settings-pages` | 6 | +792 | -11 | 1 | Populate /settings: landing page with section cards + Profile (with re-auth-gated change-password form) + Workspace stub + Team stub. Profile + password change is the priority — solves the "temp password in chat history" problem. |
| 2026-05-27 | `fix/sidebar-presence` | 3 | +9 | -6 | 1 | Lower desktop sidebar breakpoint from lg (1024px) to sm (640px) so it stays visible at typical split-screen widths instead of collapsing to hamburger. Match hamburger trigger + drawer at the same breakpoint. Bump nav-item height 28 → 32px so the sidebar fills more vertically (matches the Vercel reference). |
| 2026-05-27 | `feat/bigger-logo` | 1 | +3 | -3 | 1 | Bump Zarco mark + wordmark in sidebar top-left (20→28px ring, 14.5→18px wordmark) per user feedback. |
| 2026-05-27 | `fix/dashboard-mcp-card` | 1 | +118 | -22 | 1 | Make the "From Claude" dashboard card dynamic. Query oauth_access_tokens for live connection count + activities.source='mcp' over last 7 days. Show real numbers when ≥1 client connected (replaces the misleading "Connect a Claude client" CTA); keep the setup CTA only when 0. |
| 2026-05-27 | `feat/mcp-tools-expansion` | 6 | +537 | -8 | 1 | Add the tools Luke's Claude flagged as gaps: update_deal (full update, not just stage), update_organization, list_deals + list_contacts + list_organizations + list_tasks (no query string required, with filters), get_pipeline_summary (single-call pipeline snapshot), create_quote + list_quotes + get_quote + update_quote (full quote CRUD). Also extend update_deal_stage with an optional `reason` field that appends to the audit body. Server bumped to v0.4.0. |
| 2026-05-27 | `fix/dashboard-claude-card-cleanup` | 1 | +30 | -85 | 1 | Drop the 'From Claude' dashboard card when a client is connected (it was dead-weight signalling already-known state). Replace with a small linked pill in the greeting row ('Claude · N writes'). Widen activity+tasks to fill the reclaimed bottom-right slot when connected. CTA card still shows in the not-connected state. |
| 2026-05-27 | `feat/branded-quote-pdf` | 16 | +3,262 | -44 | 1 | Branded A4 PDF export for quotes via @react-pdf/renderer. White paper + navy ink + amber accent rule + Zarco ring mark (CSS gradient stroke). Routes: GET /q/[token]/pdf (public) and /quotes/[id]/pdf (auth-gated). Download button on internal detail page, View/Download links on public client view. ALSO: lock quotes.dealId + quotes.organizationId to NOT NULL (DB migration + zod + MCP create_quote enforcement) so quotes can't be orphans. Note: 2k of the diff is the auto-generated drizzle snapshot; real new code is ~700 LOC. |
| 2026-05-27 | `feat/quote-inline-create` | 3 | +476 | -50 | 1 | EntityCombobox component (cmdk-powered search + "+ Create" inline create). Quick-create server actions for org / deal / contact (name-only, defaults sensible). Quote form swaps the three Selects for comboboxes — type-to-search, no-match shows "+ Create as new …", click and you're back on the quote with the link populated. New contacts/deals auto-link to the selected organization. Keeps the required-deal+org constraint, removes the friction. |
| 2026-05-27 | `feat/workspaces-phase-1-schema` | 53 | +3,858 | -198 | 1 | Workspaces phase 1: schema + plumbing. New `workspaces` + `workspace_members` tables, `workspaceId NOT NULL` on all 11 CRM tables, migration 0004 that backfills every existing row into a seeded "Zarco" workspace. New `src/lib/workspace/current.ts` helper (cookie-aware) and `getPrimaryWorkspaceIdForUser` fallback for MCP. Every CRM query/insert in `(app)/*` + dashboard + command palette + activity composer now scopes by workspace. MCP tools also scope by user's primary workspace (transitional — phase 3 binds tokens to a workspace at issue time). RLS rewritten to require workspace membership on every CRM table. No visible UI change yet — switcher lands in phase 2. |
| 2026-05-28 | `feat/design-system-v2` | 22 | +770 | -513 | 1 | Complete brand flip from deep-navy + amber to paper + ink + magenta, per the new Zarco Design System bundle (May 2026 handoff). New tokens in `globals.css` — legacy var names (`--bg`, `--panel-2`, `--ink-3`, `--amber`, `--surface-3`, `--hairline`) re-bound to paper/ink/magenta equivalents so every existing component picks up the new look without per-file edits. Fonts swapped (Inter → Hanken Grotesk; Space Grotesk → DM Serif Display italic accent). New `ZarcoMark` is the heavy "Z" on a near-black tile with a magenta corner notch (variant **C** from the bundle's mark exploration). SVG favicon at `src/app/icon.svg`. Recipe classes rebuilt: paper buttons + magenta primary, paper-pure tables with mono-uppercase column heads, ink-on-paper inverted-active nav items, magenta-wash selected rows, magenta focus rings always visible. Hardcoded oklch amber/green refs across pages + dashboard + kanban + quote view + settings tiles + tasks checkbox now use the new tokens (success/warning/danger only for actual semantic status). Quote PDF rebranded — ink wordmark with magenta period, corner-notch Z mark, magenta accent rule. `.screen` grain overlay removed (was a dark-UI mannerism, looks wrong on paper). |

## Running totals (cumulative, since `main`)

| Branch | Net additions | Notes |
|---|---|---|
| `feat/mcp-oauth` | +1,202 | |
| `feat/mcp-tools` | +2,113 | |
| `feat/orgs-deals-ui` | +6,011 | |
| `feat/design-foundation` | +10,372 | Includes ~2k of archived design source under `docs/design/` |
| `feat/design-pages` | +11,196 | |
| `feat/design-new-screens` | +13,026 | |
| `feat/mcp-writes` | +15,520 | |
| `feat/projects-campaigns-polish` | +17,346 | |
| `feat/inbox-v1` | +20,229 | |
| `feat/quotes-builder` | +22,110 | Merged to main in PR #1 |
| `feat/campaigns-and-high-stakes` | +1,584 | Merged to main in PR #2 |
| `feat/vercel-deploy` | +198 | Merged to main in PR #3 — docs + config only, no app code change |
| `fix/bug-bash` | +72 | Merged to main in PR #4 — bug fix only, no app feature change |
| `feat/password-auth` | +99 | Merged to main in PR #5 — replaces magic-link sign-in with email + password |
| `feat/settings-pages` | +781 | Merged to main in PR #6 — populates the settings area (profile + change password, workspace stub, team stub, landing) |
| `fix/sidebar-presence` | +3 | Merged to main in PR #7 — sidebar visible at sm+ instead of lg+ and slightly taller nav items |
| `feat/bigger-logo` | +0 | Merged to main in PR #8 — visual tweak only, larger Zarco mark + wordmark |
| `fix/dashboard-mcp-card` | +96 | Merged to main in PR #9 — dashboard "From Claude" card now reflects real connection status |
| `feat/mcp-tools-expansion` | +529 | Merged to main in PR #10 — adds the missing MCP tools Luke's Claude session flagged |
| `fix/dashboard-claude-card-cleanup` | -55 | Merged to main in PR #11 — removes the From-Claude card once connected, replaces with a small status pill |
| `feat/branded-quote-pdf` | +3,218 | Awaiting merge in PR #12 — branded quote PDF generation + required deal/org on quotes |
| `feat/quote-inline-create` | +426 | Merged to main in PR #14 — inline create-on-the-fly for org/deal/contact from the quote form |
| `feat/workspaces-phase-1-schema` | +3,660 | Off main, current branch — workspaces tables + workspaceId on every CRM table + scoping (no UI change yet) |

Numbers are inflated by the design bundle archived in `docs/design/` (HTML +
JSX prototypes for reference) — production code is roughly half that.

## How to add a new entry

When a new branch is pushed, run:

```sh
git diff --shortstat <parent-branch>..<new-branch>
git log --oneline <parent-branch>..<new-branch> | wc -l
git diff --name-only <parent-branch>..<new-branch> | wc -l
```

…and add a row to the table above. Update the cumulative-totals table if
the branch is part of the stack heading toward `main`.
