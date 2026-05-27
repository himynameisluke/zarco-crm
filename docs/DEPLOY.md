# Deploying Zarco CRM to Vercel

End-to-end hand-off for getting the app live at `crm.zarco.uk` against your
existing Supabase project. Roughly 30 minutes of dashboard clicking on your
end, no extra code from mine.

## What you'll need before starting

- A **Vercel account** (free Hobby plan is fine for a personal CRM)
- Access to your **zarco.uk DNS** (where you bought the domain)
- The Supabase project you've been using locally — same DB will back prod
- Your **`.env.local`** values to hand (URL, anon key, DATABASE_URL)

## Step 1 — Import the GitHub repo to Vercel

1. Go to <https://vercel.com/new>
2. **Import Git Repository** → pick `himynameisluke/zarco-crm`
3. Vercel auto-detects Next.js. Leave defaults:
   - Framework: **Next.js**
   - Root directory: `./`
   - Build command: `next build` (auto)
   - Output directory: `.next` (auto)
4. **Do not click Deploy yet.** Expand **Environment Variables** first.

## Step 2 — Set environment variables

Paste these three from your local `.env.local` (same values, same project —
prod and local point at the same Supabase instance for now):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ltorwpuxtnlytgtpyodk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `eyJ...` JWT from Supabase → API → Legacy keys |
| `DATABASE_URL` | the full Transaction pooler URL with your real password |

**Optional now, recommended later:**

| Variable | Why |
|---|---|
| `REDIS_URL` | MCP session storage. Without it, mcp-handler falls back to in-memory which can flake across serverless cold starts. Upstash free tier (`rediss://default:...`) is fine. |

Now click **Deploy**. First build takes ~2 min.

## Step 3 — Confirm it works on the Vercel URL

Vercel gives you a `*.vercel.app` URL automatically (something like
`zarco-crm-abc123.vercel.app`). Open it. You should:

1. Get redirected to `/login`
2. The page loads with the navy theme + Zarco brand

**Don't try to sign in yet** — magic link redirects won't work until you
update Supabase's allowlist (Step 5). Just confirm the page renders.

## Step 4 — Wire `crm.zarco.uk` as a custom domain

1. In the Vercel project → **Settings** → **Domains**
2. Add `crm.zarco.uk`
3. Vercel will show you the DNS record to add — typically a CNAME:
   ```
   crm   CNAME   cname.vercel-dns.com
   ```
   (Or for an A record on an apex domain, but we're using a subdomain so
   CNAME is fine.)
4. Add that record in your DNS provider's panel for `zarco.uk`. Save.
5. Back in Vercel, wait — it'll auto-detect propagation (usually 1-10 min).
   When it shows "Valid Configuration" and provisions an HTTPS cert, you're
   live at `crm.zarco.uk`.

## Step 5 — Update Supabase Auth allowlist

Magic link sign-in will fail until Supabase knows about the new URL.

1. Supabase dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** add `https://crm.zarco.uk` (replace the localhost one, or
   keep both — Supabase only uses Site URL as the default fallback)
3. **Redirect URLs (allowlist):** add `https://crm.zarco.uk/auth/callback`
   (leave the localhost entry too, so dev keeps working)
4. Save changes.

## Step 6 — Test the deployed app end-to-end

In your browser, visit `https://crm.zarco.uk`:

- [ ] Get redirected to `/login`
- [ ] Enter your email, request magic link
- [ ] Click the link in your inbox — should land you at `/` (the dashboard)
- [ ] Navigate to `/contacts`, `/deals`, `/quotes`, etc. — same data as local
- [ ] Open a quote, click "Mark sent", copy the public link — opens
      `https://crm.zarco.uk/q/[token]` and the public client view loads
- [ ] Open `/settings/mcp` — the MCP endpoint URL now shows `https://crm.zarco.uk/mcp`

## Step 7 — (Optional) Wire Upstash Redis for MCP

If you skip this, MCP works most of the time but may fail when a multi-step
flow (initialize → list tools → call tool) hits different serverless
instances. Symptom: "session not found" errors.

1. Go to <https://upstash.com> → **Create Database** → free tier, pick the
   region closest to `eu-west-2` (e.g. London/Frankfurt)
2. Copy the **TLS/Redis URL** (starts with `rediss://`)
3. Vercel → project → Settings → Environment Variables → add `REDIS_URL`
4. Redeploy (or trigger from Vercel UI — push to main works too)

## Step 8 — Hook Claude Desktop to the prod MCP endpoint

In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zarco-crm": {
      "url": "https://crm.zarco.uk/mcp"
    }
  }
}
```

Restart Claude Desktop. First use triggers OAuth in your browser. Approve
once and you're live.

For Claude.ai web: Settings → Connectors → Add custom → URL
`https://crm.zarco.uk/mcp`. Same OAuth flow in a popup.

## Common issues

**Magic link redirects to localhost** — Step 5 wasn't done; Supabase is
still defaulting to the local Site URL.

**500 on first page load** — Env vars missing or wrong. Vercel → project →
Deployments → click the failing build → Function logs to see the error.

**`Tenant or user not found`** — `DATABASE_URL` username is wrong. Must be
`postgres.YOUR-PROJECT-REF`, not just `postgres`. Re-copy from Supabase →
Connect → Drizzle.

**MCP "session not found" errors** — set `REDIS_URL` (Step 7).

**Slow first request** — Vercel cold starts. Normal. Subsequent requests
within ~5 min are warm and fast.

## Going forward

- Pushing to `main` auto-deploys. Pushing to any other branch creates a
  preview deployment at a `*-preview.vercel.app` URL.
- Migrations: when you run `pnpm db:migrate` locally it hits the same DB
  as prod (we share one Supabase project). Schema changes deploy
  automatically with the code that uses them — no separate migration step
  on Vercel.
- Logs: Vercel → project → Deployments → click any deployment → Function
  Logs. MCP requests show up here.
