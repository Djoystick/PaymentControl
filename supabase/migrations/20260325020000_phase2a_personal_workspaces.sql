create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspaces_kind_check check (kind in ('personal', 'family'))
);

create index if not exists workspaces_owner_profile_id_idx
  on public.workspaces (owner_profile_id);

create unique index if not exists workspaces_personal_owner_unique
  on public.workspaces (owner_profile_id)
  where kind = 'personal';

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint workspace_members_role_check check (member_role in ('owner', 'member'))
);

create unique index if not exists workspace_members_workspace_profile_unique
  on public.workspace_members (workspace_id, profile_id);

create index if not exists workspace_members_profile_id_idx
  on public.workspace_members (profile_id);

alter table public.profiles
  add column if not exists active_workspace_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_active_workspace_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_active_workspace_id_fkey
      foreign key (active_workspace_id)
      references public.workspaces(id)
      on delete set null;
  end if;
end $$;

create index if not exists profiles_active_workspace_id_idx
  on public.profiles (active_workspace_id);
