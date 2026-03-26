create extension if not exists pgcrypto;

create table if not exists public.family_workspace_invites (
  id uuid primary key default gen_random_uuid(),
  invite_token text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inviter_profile_id uuid not null references public.profiles(id) on delete cascade,
  invite_status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  constraint family_workspace_invites_status_check
    check (invite_status in ('active', 'accepted', 'expired', 'revoked'))
);

create index if not exists family_workspace_invites_workspace_idx
  on public.family_workspace_invites (workspace_id, created_at desc);

create index if not exists family_workspace_invites_token_idx
  on public.family_workspace_invites (invite_token);

create unique index if not exists family_workspace_invites_active_workspace_unique
  on public.family_workspace_invites (workspace_id)
  where invite_status = 'active';
