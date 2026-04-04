-- Phase 28A: Travel / Group Expenses foundation with manual-first MVP data model.

create extension if not exists pgcrypto;

create table if not exists public.travel_trips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  base_currency char(3) not null,
  description text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_trips_title_check check (char_length(trim(title)) between 1 and 120),
  constraint travel_trips_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  constraint travel_trips_description_check check (
    description is null or char_length(description) <= 500
  )
);

create index if not exists travel_trips_workspace_updated_idx
  on public.travel_trips (workspace_id, updated_at desc);

create table if not exists public.travel_trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  telegram_user_id bigint,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_trip_members_display_name_check check (
    char_length(trim(display_name)) between 1 and 80
  ),
  constraint travel_trip_members_telegram_user_id_check check (
    telegram_user_id is null or telegram_user_id > 0
  )
);

create unique index if not exists travel_trip_members_trip_profile_unique
  on public.travel_trip_members (trip_id, profile_id)
  where profile_id is not null;

create unique index if not exists travel_trip_members_trip_telegram_unique
  on public.travel_trip_members (trip_id, telegram_user_id)
  where telegram_user_id is not null;

create unique index if not exists travel_trip_members_id_trip_unique
  on public.travel_trip_members (id, trip_id);

create index if not exists travel_trip_members_trip_idx
  on public.travel_trip_members (trip_id, created_at);

create table if not exists public.travel_trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  paid_by_member_id uuid not null,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  description text not null,
  category text not null,
  split_mode text not null,
  spent_at timestamptz not null default timezone('utc', now()),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_trip_expenses_amount_check check (amount > 0),
  constraint travel_trip_expenses_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint travel_trip_expenses_description_check check (
    char_length(trim(description)) between 1 and 240
  ),
  constraint travel_trip_expenses_category_check check (
    char_length(trim(category)) between 1 and 80
  ),
  constraint travel_trip_expenses_split_mode_check check (
    split_mode in ('equal_all', 'equal_selected', 'full_one', 'manual_amounts')
  ),
  constraint travel_trip_expenses_paid_member_trip_fkey
    foreign key (paid_by_member_id, trip_id)
    references public.travel_trip_members(id, trip_id)
    on delete restrict
);

create unique index if not exists travel_trip_expenses_id_trip_unique
  on public.travel_trip_expenses (id, trip_id);

create index if not exists travel_trip_expenses_trip_spent_idx
  on public.travel_trip_expenses (trip_id, spent_at desc, created_at desc);

create index if not exists travel_trip_expenses_paid_member_idx
  on public.travel_trip_expenses (paid_by_member_id);

create table if not exists public.travel_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null,
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  member_id uuid not null,
  share_amount numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_expense_splits_share_amount_check check (share_amount > 0),
  constraint travel_expense_splits_expense_trip_fkey
    foreign key (expense_id, trip_id)
    references public.travel_trip_expenses(id, trip_id)
    on delete cascade,
  constraint travel_expense_splits_member_trip_fkey
    foreign key (member_id, trip_id)
    references public.travel_trip_members(id, trip_id)
    on delete restrict
);

create unique index if not exists travel_expense_splits_expense_member_unique
  on public.travel_expense_splits (expense_id, member_id);

create index if not exists travel_expense_splits_expense_idx
  on public.travel_expense_splits (expense_id);

create index if not exists travel_expense_splits_trip_member_idx
  on public.travel_expense_splits (trip_id, member_id);
