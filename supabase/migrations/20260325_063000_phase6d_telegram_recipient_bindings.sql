create extension if not exists pgcrypto;

create table if not exists public.telegram_recipient_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  telegram_user_id text,
  recipient_chat_id text,
  binding_source text not null default 'profile_telegram_user_id',
  binding_status text not null default 'unverified',
  verified_at timestamptz,
  last_status_reason text,
  last_status_reason_is_inference boolean not null default false,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint telegram_recipient_bindings_source_check
    check (binding_source in ('profile_telegram_user_id', 'stored_chat_id')),
  constraint telegram_recipient_bindings_status_check
    check (binding_status in ('missing', 'unverified', 'verified', 'invalid'))
);

create unique index if not exists telegram_recipient_bindings_workspace_profile_unique
  on public.telegram_recipient_bindings (workspace_id, profile_id);
