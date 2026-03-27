create extension if not exists pgcrypto;

create table if not exists public.premium_entitlements (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  entitlement_source text not null,
  status text not null default 'active',
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint premium_entitlements_scope_check
    check (scope in ('profile', 'workspace')),
  constraint premium_entitlements_source_check
    check (entitlement_source in ('manual_admin', 'boosty', 'gift_campaign')),
  constraint premium_entitlements_status_check
    check (status in ('active', 'expired', 'revoked')),
  constraint premium_entitlements_scope_owner_check
    check (
      (scope = 'profile' and profile_id is not null and workspace_id is null)
      or
      (scope = 'workspace' and workspace_id is not null and profile_id is null)
    ),
  constraint premium_entitlements_time_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists premium_entitlements_profile_idx
  on public.premium_entitlements (profile_id, status, starts_at desc, created_at desc)
  where scope = 'profile';

create index if not exists premium_entitlements_workspace_idx
  on public.premium_entitlements (workspace_id, status, starts_at desc, created_at desc)
  where scope = 'workspace';
