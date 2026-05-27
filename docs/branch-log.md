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
| `feat/mcp-tools-expansion` | +529 | Off main, current branch — adds the missing MCP tools Luke's Claude session flagged |

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
