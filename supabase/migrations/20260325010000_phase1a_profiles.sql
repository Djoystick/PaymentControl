create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  username text,
  first_name text not null,
  last_name text,
  photo_url text,
  selected_scenario text not null default 'single',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  constraint profiles_selected_scenario_check
    check (selected_scenario in ('single', 'family'))
);

create index if not exists profiles_telegram_user_id_idx
  on public.profiles (telegram_user_id);
