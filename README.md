# Zarco CRM

Custom CRM for Zarco. Built on Next.js 16 (App Router) + Supabase + Drizzle, hosted on Vercel.

## First-time setup

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Create a Supabase project** at <https://supabase.com/dashboard>. Region: `eu-west-2` (London) for proximity.

3. **Copy env vars**

   ```sh
   cp .env.example .env.local
   ```

   Fill in from Supabase project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings → API
   - `DATABASE_URL` → Settings → Database → Connection string (Transaction pooler, port 6543)

4. **Run migrations**

   ```sh
   pnpm db:generate   # build SQL from schema.ts
   pnpm db:migrate    # apply to Supabase
   ```

5. **Start the dev server**

   ```sh
   pnpm dev
   ```

## Stack

- **Framework:** Next.js 16 (App Router, React Server Components, Turbopack)
- **Database:** Supabase Postgres
- **ORM:** Drizzle
- **Auth:** Supabase Auth (email/password, magic links)
- **UI:** Tailwind 4 + shadcn/ui (base-nova preset)
- **Hosting:** Vercel

## Project structure

```
src/
  app/              Next.js App Router pages
  components/       Reusable React components
    ui/             shadcn components
  lib/
    db/             Drizzle schema + client
    supabase/       Supabase clients (server, client, middleware)
  middleware.ts     Refreshes Supabase auth on every request
drizzle/            Generated SQL migrations (committed)
```

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate a new migration from schema.ts changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (skip migrations — dev only) |
| `pnpm db:studio` | Open Drizzle Studio (browse data) |

## Roadmap

Short version of the phased plan:

- **Phase 1:** Foundation (this commit) — schema, auth scaffold, CRUD UI
- **Phase 2:** Activity timeline + generic ingest webhook
- **Phase 3:** Outlook sync via Microsoft Graph + outbound email via Resend
- **Phase 4:** Quote builder + PDF render
- **Phase 5:** MCP server for Claude integration
- **Post-MVP:** Granola integration, team features
