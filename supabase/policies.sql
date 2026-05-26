-- Row Level Security policies for Zarco CRM
--
-- Phase 1 strategy: enable RLS on every table and allow any authenticated user
-- full access. This blocks the anon (public) Supabase key from reading anything
-- while still letting the app function for the (small, trusted) set of users
-- you invite to your Supabase project via the dashboard.
--
-- When we grow beyond ~5 users we'll add a `workspaces` table + `workspace_id`
-- column on every entity, and tighten these policies to filter by membership.
-- Until then, this is the right level of strictness for solo / small-team use.
--
-- Apply this file:
--   - via Supabase dashboard SQL editor (paste + run), OR
--   - via `supabase db push` if/when we adopt the Supabase CLI

-- =============================================================================
-- Enable RLS on every public table
-- =============================================================================

alter table public.organizations    enable row level security;
alter table public.contacts         enable row level security;
alter table public.deals            enable row level security;
alter table public.projects         enable row level security;
alter table public.activities       enable row level security;
alter table public.tasks            enable row level security;
alter table public.quotes           enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.email_campaigns  enable row level security;
alter table public.email_sends      enable row level security;
alter table public.inbox_items      enable row level security;

-- =============================================================================
-- Phase 1: any authenticated user can read/write everything
-- =============================================================================

create policy "authenticated_all" on public.organizations
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.contacts
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.deals
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.projects
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.activities
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.tasks
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.quotes
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.quote_line_items
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.email_campaigns
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.email_sends
  for all to authenticated using (true) with check (true);

create policy "authenticated_all" on public.inbox_items
  for all to authenticated using (true) with check (true);

-- =============================================================================
-- Public quote access via public_token (no auth required)
-- =============================================================================
-- Quotes can be viewed by the recipient without an account, using the
-- ?token=<uuid> public link. This policy is intentionally narrow: SELECT only,
-- only when the request includes the matching token via PostgREST's setting.

-- TODO (phase 4): add a separate policy that allows anon SELECT on a single
-- quote when current_setting('request.jwt.claim.quote_token', true) matches
-- the row's public_token. Implementing this requires the public quote page to
-- set the header on each Supabase request.

-- =============================================================================
-- OAuth tables: RLS on, no policies (Drizzle-only access)
-- =============================================================================
-- These tables hold sensitive material: client secrets, authorization codes,
-- and access token hashes. They must NEVER be reachable via the public Supabase
-- API (anon or authenticated key). RLS with zero policies means PostgREST
-- returns no rows. Our server-side Drizzle connection uses the postgres role
-- which bypasses RLS, so app code is unaffected.

alter table public.oauth_clients              enable row level security;
alter table public.oauth_authorization_codes  enable row level security;
alter table public.oauth_access_tokens        enable row level security;
