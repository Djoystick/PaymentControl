-- Phase 28E: trip closure states + settlement finalization foundation.

alter table if exists public.travel_trips
  add column if not exists status text not null default 'active',
  add column if not exists closed_at timestamptz,
  add column if not exists closure_updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trips_status_check'
      and conrelid = 'public.travel_trips'::regclass
  ) then
    alter table public.travel_trips
      add constraint travel_trips_status_check
      check (status in ('active', 'closing', 'closed'));
  end if;
end
$$;

create table if not exists public.travel_trip_settlement_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  amount numeric(12, 2) not null,
  status text not null default 'open',
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_trip_settlement_items_amount_check check (amount > 0),
  constraint travel_trip_settlement_items_status_check check (status in ('open', 'settled')),
  constraint travel_trip_settlement_items_from_to_check check (from_member_id <> to_member_id),
  constraint travel_trip_settlement_items_settled_at_check check (
    (status = 'settled' and settled_at is not null)
    or (status = 'open' and settled_at is null)
  ),
  constraint travel_trip_settlement_items_from_member_trip_fkey
    foreign key (from_member_id, trip_id)
    references public.travel_trip_members(id, trip_id)
    on delete restrict,
  constraint travel_trip_settlement_items_to_member_trip_fkey
    foreign key (to_member_id, trip_id)
    references public.travel_trip_members(id, trip_id)
    on delete restrict
);

create unique index if not exists travel_trip_settlement_items_trip_from_to_unique
  on public.travel_trip_settlement_items (trip_id, from_member_id, to_member_id);

create index if not exists travel_trip_settlement_items_trip_status_idx
  on public.travel_trip_settlement_items (trip_id, status, updated_at desc);
