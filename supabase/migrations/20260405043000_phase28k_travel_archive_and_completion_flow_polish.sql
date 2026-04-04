-- Phase 28K: travel archive/completion lifecycle polish.
-- Adds explicit archived state for trips with lightweight archive timestamp.

alter table if exists public.travel_trips
  add column if not exists archived_at timestamptz;

update public.travel_trips
set archived_at = null
where status <> 'archived'
  and archived_at is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'travel_trips_status_check'
      and conrelid = 'public.travel_trips'::regclass
  ) then
    alter table public.travel_trips
      drop constraint travel_trips_status_check;
  end if;

  alter table public.travel_trips
    add constraint travel_trips_status_check
    check (status in ('active', 'closing', 'closed', 'archived'));
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trips_archived_state_check'
      and conrelid = 'public.travel_trips'::regclass
  ) then
    alter table public.travel_trips
      add constraint travel_trips_archived_state_check
      check (
        (status = 'archived' and archived_at is not null)
        or (status <> 'archived' and archived_at is null)
      );
  end if;
end
$$;

create index if not exists travel_trips_workspace_status_updated_idx
  on public.travel_trips (workspace_id, status, updated_at desc);
