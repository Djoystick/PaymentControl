create extension if not exists pgcrypto;

create table if not exists public.premium_purchase_intents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  telegram_user_id text not null,
  intent_rail text not null default 'boosty_premium',
  expected_tier text not null default 'premium_monthly',
  correlation_code text not null,
  intent_status text not null default 'created',
  claim_id uuid references public.premium_purchase_claims(id) on delete set null,
  opened_external_at timestamptz,
  returned_at timestamptz,
  claimed_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint premium_purchase_intents_telegram_user_id_check
    check (telegram_user_id ~ '^[0-9]{5,20}$'),
  constraint premium_purchase_intents_rail_check
    check (intent_rail in ('boosty_premium')),
  constraint premium_purchase_intents_status_check
    check (
      intent_status in (
        'created',
        'opened_external',
        'returned',
        'claimed',
        'consumed',
        'expired',
        'cancelled'
      )
    ),
  constraint premium_purchase_intents_expected_tier_check
    check (char_length(trim(expected_tier)) between 1 and 64),
  constraint premium_purchase_intents_correlation_code_check
    check (correlation_code ~ '^PC-[A-Z0-9]{5,12}$'),
  constraint premium_purchase_intents_claim_link_check
    check (
      (claim_id is null and claimed_at is null)
      or (claim_id is not null and claimed_at is not null)
    )
);

create unique index if not exists premium_purchase_intents_correlation_code_uidx
  on public.premium_purchase_intents (correlation_code);

create index if not exists premium_purchase_intents_profile_idx
  on public.premium_purchase_intents (profile_id, created_at desc);

create index if not exists premium_purchase_intents_telegram_status_idx
  on public.premium_purchase_intents (telegram_user_id, intent_status, created_at desc);

create index if not exists premium_purchase_intents_claim_idx
  on public.premium_purchase_intents (claim_id);

alter table public.premium_purchase_claims
  add column if not exists purchase_intent_id uuid references public.premium_purchase_intents(id) on delete set null,
  add column if not exists purchase_correlation_code text;

create index if not exists premium_purchase_claims_intent_idx
  on public.premium_purchase_claims (purchase_intent_id);

create index if not exists premium_purchase_claims_correlation_idx
  on public.premium_purchase_claims (purchase_correlation_code);
