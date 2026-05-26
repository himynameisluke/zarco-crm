# Zarco CRM MCP server

This document covers the MCP server that lives on the `feat/mcp-tools`
branch — what it does, how to connect from each Claude surface, and the
tool reference.

Builds on [OAUTH.md](./OAUTH.md). The OAuth layer (separate branch) is a
prerequisite; clients can't reach `/mcp` without a valid bearer token.

## What's in this branch

- Real MCP server at `POST /mcp` (Streamable HTTP transport) replacing the
  phase-A stub
- 8 read-only tools across contacts, organizations, deals, and the
  activity timeline
- 8 write tools that mutate the CRM with a full audit trail
- `mcp-handler` (Vercel's Next.js adapter) wired to the OAuth bearer
  verification from the phase-A branch

The transport is HTTP-based (the SSE legacy transport is intentionally
disabled per the 2025-03-26 spec deprecation). All requests run through
`withMcpAuth`, which rejects unauthenticated calls with a 401 +
`WWW-Authenticate: Bearer resource_metadata="..."` so MCP clients can
discover the authorization server.

## Tool reference

All tools are **read-only and idempotent** (`annotations.readOnlyHint: true`).
Inputs validated with zod; outputs are JSON-encoded text content.

### Contacts ([contacts.ts](../src/lib/mcp/tools/contacts.ts))

| Tool | Input | Returns |
|---|---|---|
| `find_contact` | `query: string` | Up to 20 matches with id, name, email, title, organization name |
| `get_contact` | `id: uuid` | Full contact record + 20 most recent activities linked to them |

### Organizations ([organizations.ts](../src/lib/mcp/tools/organizations.ts))

| Tool | Input | Returns |
|---|---|---|
| `find_organization` | `query: string` | Up to 20 matches with id, name, domain, industry |
| `get_organization` | `id: uuid` | Full org + all contacts + all deals (heavy query — use sparingly) |

### Deals ([deals.ts](../src/lib/mcp/tools/deals.ts))

| Tool | Input | Returns |
|---|---|---|
| `find_deal` | `query: string`, `stage?: enum` | Up to 20 deals with id, name, stage, value, organization name |
| `get_deal` | `id: uuid` | Deal + organization + primary contact + 20 activities + projects + quotes |

### Activity timeline ([activities.ts](../src/lib/mcp/tools/activities.ts))

| Tool | Input | Returns |
|---|---|---|
| `search_activities` | `query?: string`, `type?: enum`, `subjectType?: enum`, `days?: 1-365` | Up to 50 activities, newest first |
| `list_recent_activities` | `days?: 1-90` (default 7), `limit?: 1-100` (default 50) | Recent activities across the whole CRM |

## Write tools — mutations

Every write tool inserts an audit activity (source=`mcp`) on the affected
entity's timeline. Failures of the audit insert are caught and logged but
never roll back the underlying write. See
[src/lib/mcp/audit.ts](../src/lib/mcp/audit.ts).

### Contacts ([contacts.ts](../src/lib/mcp/tools/contacts.ts))

| Tool | Input | Effect |
|---|---|---|
| `create_contact` | `firstName` (req), `lastName?`, `email?`, `phone?`, `title?`, `linkedinUrl?`, `organizationId?`, `notes?` | Inserts contact, audits as 'note' on the new contact |
| `update_contact` | `id`, plus any subset of the create fields | Partial update — only provided fields change. Audits with the changed-field list |

### Organizations ([organizations.ts](../src/lib/mcp/tools/organizations.ts))

| Tool | Input | Effect |
|---|---|---|
| `create_organization` | `name` (req), `domain?`, `website?`, `industry?`, `employeeCount?`, `notes?` | Inserts org, audits as 'note' on the new org |

### Deals ([deals.ts](../src/lib/mcp/tools/deals.ts))

| Tool | Input | Effect |
|---|---|---|
| `create_deal` | `name` (req), `type?`, `stage?`, `valuePence?` (integer), `currency?` (default GBP), `closeDate?` (YYYY-MM-DD), `organizationId?`, `primaryContactId?` | Inserts deal, audits with stage + type |
| `update_deal_stage` | `id`, `stage` | Moves the deal. Audits as 'status_change' with the before→after stages in metadata. No-op if stage unchanged |

### Activities ([activities.ts](../src/lib/mcp/tools/activities.ts))

| Tool | Input | Effect |
|---|---|---|
| `log_activity` | `type` (email/call/meeting/note), `subjectType`, `subjectId`, `subject` (headline), `body?` (long-form / transcript), `occurredAt?` (ISO) | Inserts an activity directly. Source is hardcoded to `mcp`. Use this for Granola transcripts, manually-noted call summaries, etc. |

### Tasks ([tasks.ts](../src/lib/mcp/tools/tasks.ts))

| Tool | Input | Effect |
|---|---|---|
| `create_task` | `title` (req), `description?`, `dueAt?` (ISO), `subjectType?` + `subjectId?` (both or neither) | Inserts task assigned to the calling user. If linked to an entity, audits as a note on that entity's timeline |
| `complete_task` | `id` | Sets status=done + completedAt. If linked to an entity, audits as 'task_completed' on that entity's timeline |

## Connecting from clients

### Claude.ai web

1. Settings → Connectors → Add custom MCP server
2. Server URL: `https://crm.zarco.uk/mcp` (or the localhost equivalent during dev)
3. Claude will hit `/.well-known/oauth-protected-resource`, discover our auth
   server, and walk you through the OAuth flow automatically
4. After authorization the connector is live; tools appear in the tools menu

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zarco-crm": {
      "url": "https://crm.zarco.uk/mcp"
    }
  }
}
```

Restart Claude Desktop. First use will trigger the OAuth flow in a browser tab.

For local dev, replace the URL with `http://localhost:3000/mcp`.

### Claude Code

```json
// ~/.claude/config.json or .mcp.json in your project
{
  "mcpServers": {
    "zarco-crm": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Custom agents via the Anthropic SDK

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const response = await client.beta.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  mcp_servers: [
    {
      type: "url",
      url: "https://crm.zarco.uk/mcp",
      name: "zarco-crm",
      authorization_token: process.env.ZARCO_MCP_TOKEN, // OAuth access token
    },
  ],
  messages: [{ role: "user", content: "Who did I meet with this week?" }],
});
```

### curl (debugging)

```sh
# initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl-test","version":"0.0.1"}}}'

# list tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <access_token>" \
  -H "Mcp-Session-Id: <session-from-init>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <access_token>" \
  -H "Mcp-Session-Id: <session-from-init>" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_recent_activities","arguments":{"days":7}}}'
```

## Session storage

`mcp-handler` keeps per-session transport state. In dev (single Node process)
the in-memory fallback works fine. For production on Vercel — where each
request can land on a different lambda — wire Upstash KV by setting
`REDIS_URL` (or `KV_URL` on Vercel KV). Add a check before deploying.

## What's NOT here (yet)

- **High-stakes tools** (Phase D) — `send_quote`, `send_email`, `delete_*`.
  These will use MCP elicitation to surface a confirmation prompt in the
  Claude client before executing.
- **The composite `record_meeting(transcript)` tool** — dropped per the
  Granola Path B decision. Luke's Claude composes the narrow primitives
  (find_contact + log_activity + create_task) via his subscription
  instead. See `memory/mcp-design.md` for the reasoning.

## Testing locally end-to-end

1. Run through the [OAUTH.md](./OAUTH.md) "Trying it locally" steps to get
   an access token
2. Add Zarco CRM to your Claude Desktop config (see above)
3. In a Claude Desktop conversation: *"Use the zarco-crm tools — what
   activities happened this week?"*
4. First call triggers the OAuth flow in a browser tab
5. Once authorized, tools appear and Claude can read your CRM

The fastest sniff test without Claude Desktop is the three curl commands
in the debugging section — they validate `initialize`, `tools/list`,
and `tools/call` end-to-end.
