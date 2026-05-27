-- Row Level Security policies for Zarco CRM
--
-- Phase 1 of workspaces is now live: every CRM row has a `workspace_id`.
-- Policies enforce that the authenticated user can only see/touch rows in
-- workspaces they belong to. The check is the same shape on every table:
--
--   USING (workspace_id IN (
--     SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
--   ))
--
-- and the same expression for WITH CHECK on inserts/updates so a user can't
-- write rows into a workspace they're not a member of.
--
-- App-layer Drizzle queries already scope by workspace. RLS is defense in
-- depth — anything reaching the public Supabase API (anon / authenticated
-- keys) gets filtered here too.
--
-- Apply this file:
--   - via Supabase dashboard SQL editor (paste + run), OR
--   - via `supabase db push` once the CLI is wired up

-- =============================================================================
-- Workspace tables — meta policies
-- =============================================================================
-- Users can see / manage their own membership. Workspaces themselves are
-- visible to their members; only the owner can update / delete.

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;

-- Workspaces: visible to any member; only owners can modify
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated
  using (
    id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

drop policy if exists "workspaces_insert_self" on public.workspaces;
create policy "workspaces_insert_self" on public.workspaces
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner" on public.workspaces
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner" on public.workspaces
  for delete to authenticated
  using (owner_id = auth.uid());

-- Workspace members: user manages their own rows. (Team flow with admin-led
-- invites lands in a later phase — keeping this minimal for solo use.)
drop policy if exists "members_select_self" on public.workspace_members;
create policy "members_select_self" on public.workspace_members
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "members_insert_self" on public.workspace_members;
create policy "members_insert_self" on public.workspace_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "members_delete_self" on public.workspace_members;
create policy "members_delete_self" on public.workspace_members
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- CRM tables — RLS scoped by workspace membership
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

-- Drop the previous phase-1-of-CRM "authenticated_all" policies so the new
-- workspace-scoped ones can take over with the same name.
drop policy if exists "authenticated_all" on public.organizations;
drop policy if exists "authenticated_all" on public.contacts;
drop policy if exists "authenticated_all" on public.deals;
drop policy if exists "authenticated_all" on public.projects;
drop policy if exists "authenticated_all" on public.activities;
drop policy if exists "authenticated_all" on public.tasks;
drop policy if exists "authenticated_all" on public.quotes;
drop policy if exists "authenticated_all" on public.quote_line_items;
drop policy if exists "authenticated_all" on public.email_campaigns;
drop policy if exists "authenticated_all" on public.email_sends;
drop policy if exists "authenticated_all" on public.inbox_items;

-- The membership check, applied uniformly to every CRM table:
create policy "workspace_member_all" on public.organizations
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.contacts
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.deals
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.projects
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.activities
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.tasks
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.quotes
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.quote_line_items
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.email_campaigns
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.email_sends
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy "workspace_member_all" on public.inbox_items
  for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

-- =============================================================================
-- Public quote access via public_token (no auth required)
-- =============================================================================
-- TODO (later): allow anon SELECT on a single quote when the request includes
-- the matching public_token. Implementing this requires the public quote page
-- to set the header on each Supabase request. Today the public PDF + viewer
-- routes use the server-side Drizzle (postgres role) which bypasses RLS, so
-- this isn't blocking — but tightening it remains the right long-term move.

-- =============================================================================
-- OAuth tables: RLS on, no policies (Drizzle-only access)
-- =============================================================================
-- These tables hold sensitive material: client secrets, authorization codes,
-- and access token hashes. They must NEVER be reachable via the public
-- Supabase API (anon or authenticated key). RLS with zero policies means
-- PostgREST returns no rows. Our server-side Drizzle connection uses the
-- postgres role which bypasses RLS, so app code is unaffected.

alter table public.oauth_clients              enable row level security;
alter table public.oauth_authorization_codes  enable row level security;
alter table public.oauth_access_tokens        enable row level security;
