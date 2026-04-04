-- Phase 28M: shared trip identity linking + invite/join flow foundation.
-- Adds lightweight invite token lifecycle without breaking existing local participants.

create table if not exists public.travel_trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invite_token text not null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  invite_status text not null default 'active',
  expires_at timestamptz,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_member_id uuid references public.travel_trip_members(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_trip_invites_token_check
    check (invite_token ~ '^trip_[A-Za-z0-9]+$'),
  constraint travel_trip_invites_status_check
    check (invite_status in ('active', 'accepted', 'expired', 'revoked')),
  constraint travel_trip_invites_accepted_state_check
    check (
      (invite_status = 'accepted' and accepted_by_profile_id is not null and accepted_at is not null)
      or (invite_status <> 'accepted' and accepted_by_profile_id is null and accepted_at is null)
    )
);

create unique index if not exists travel_trip_invites_token_unique
  on public.travel_trip_invites (invite_token);

create unique index if not exists travel_trip_invites_trip_active_unique
  on public.travel_trip_invites (trip_id)
  where invite_status = 'active';

create index if not exists travel_trip_invites_trip_status_created_idx
  on public.travel_trip_invites (trip_id, invite_status, created_at desc);

create index if not exists travel_trip_invites_workspace_status_created_idx
  on public.travel_trip_invites (workspace_id, invite_status, created_at desc);
