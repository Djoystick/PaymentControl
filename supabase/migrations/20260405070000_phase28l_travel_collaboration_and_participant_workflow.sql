-- Phase 28L: participant collaboration model for travel trips.
-- Adds lightweight participant role/status lifecycle without mixing travel and recurring domains.

alter table if exists public.travel_trip_members
  add column if not exists role text not null default 'participant',
  add column if not exists status text not null default 'active',
  add column if not exists inactive_at timestamptz;

update public.travel_trip_members
set role = coalesce(role, 'participant'),
    status = coalesce(status, 'active');

update public.travel_trip_members
set inactive_at = null
where status = 'active'
  and inactive_at is not null;

update public.travel_trip_members
set inactive_at = coalesce(inactive_at, timezone('utc', now()))
where status = 'inactive';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_members_role_check'
      and conrelid = 'public.travel_trip_members'::regclass
  ) then
    alter table public.travel_trip_members
      add constraint travel_trip_members_role_check
      check (role in ('organizer', 'participant'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_members_status_check'
      and conrelid = 'public.travel_trip_members'::regclass
  ) then
    alter table public.travel_trip_members
      add constraint travel_trip_members_status_check
      check (status in ('active', 'inactive'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_members_organizer_active_check'
      and conrelid = 'public.travel_trip_members'::regclass
  ) then
    alter table public.travel_trip_members
      add constraint travel_trip_members_organizer_active_check
      check (role <> 'organizer' or status = 'active');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_members_inactive_at_check'
      and conrelid = 'public.travel_trip_members'::regclass
  ) then
    alter table public.travel_trip_members
      add constraint travel_trip_members_inactive_at_check
      check (
        (status = 'inactive' and inactive_at is not null)
        or (status = 'active' and inactive_at is null)
      );
  end if;
end
$$;

with ranked_organizers as (
  select
    id,
    row_number() over (partition by trip_id order by created_at, id) as organizer_rank
  from public.travel_trip_members
  where role = 'organizer'
)
update public.travel_trip_members as members
set role = 'participant',
    updated_at = timezone('utc', now())
from ranked_organizers
where members.id = ranked_organizers.id
  and ranked_organizers.organizer_rank > 1;

with trips_without_organizer as (
  select trip_id
  from public.travel_trip_members
  group by trip_id
  having sum(case when role = 'organizer' then 1 else 0 end) = 0
),
first_member_per_trip as (
  select
    members.id,
    row_number() over (partition by members.trip_id order by members.created_at, members.id) as member_rank
  from public.travel_trip_members as members
  join trips_without_organizer as trips_without
    on trips_without.trip_id = members.trip_id
)
update public.travel_trip_members as members
set role = 'organizer',
    status = 'active',
    inactive_at = null,
    updated_at = timezone('utc', now())
from first_member_per_trip as first_member
where members.id = first_member.id
  and first_member.member_rank = 1;

create unique index if not exists travel_trip_members_trip_organizer_unique
  on public.travel_trip_members (trip_id)
  where role = 'organizer';

create index if not exists travel_trip_members_trip_status_created_idx
  on public.travel_trip_members (trip_id, status, created_at);
