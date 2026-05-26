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
| `feat/campaigns-and-high-stakes` | +1,584 | Off main, current branch |

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
