create extension if not exists pgcrypto;

create table if not exists public.premium_purchase_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  telegram_user_id text not null,
  claim_rail text not null default 'boosty_premium',
  expected_tier text not null default 'premium',
  external_payer_handle text,
  payment_proof_reference text,
  payment_proof_text text,
  claim_status text not null default 'submitted',
  claim_note text,
  admin_note text,
  entitlement_id uuid references public.premium_entitlements(id) on delete set null,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by_admin_telegram_user_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint premium_purchase_claims_telegram_user_id_check
    check (telegram_user_id ~ '^[0-9]{5,20}$'),
  constraint premium_purchase_claims_rail_check
    check (claim_rail in ('boosty_premium')),
  constraint premium_purchase_claims_status_check
    check (
      claim_status in (
        'draft',
        'submitted',
        'pending_review',
        'approved',
        'rejected',
        'expired',
        'cancelled'
      )
    ),
  constraint premium_purchase_claims_expected_tier_check
    check (char_length(trim(expected_tier)) between 1 and 64),
  constraint premium_purchase_claims_external_payer_handle_check
    check (
      external_payer_handle is null
      or char_length(external_payer_handle) <= 128
    ),
  constraint premium_purchase_claims_payment_proof_reference_check
    check (
      payment_proof_reference is null
      or char_length(payment_proof_reference) <= 512
    ),
  constraint premium_purchase_claims_payment_proof_text_check
    check (
      payment_proof_text is null
      or char_length(payment_proof_text) <= 4000
    ),
  constraint premium_purchase_claims_claim_note_check
    check (claim_note is null or char_length(claim_note) <= 1000),
  constraint premium_purchase_claims_admin_note_check
    check (admin_note is null or char_length(admin_note) <= 1000),
  constraint premium_purchase_claims_reviewed_by_requires_reviewed_at_check
    check (
      reviewed_by_admin_telegram_user_id is null
      or reviewed_at is not null
    )
);

create index if not exists premium_purchase_claims_profile_idx
  on public.premium_purchase_claims (profile_id, submitted_at desc);

create index if not exists premium_purchase_claims_telegram_status_idx
  on public.premium_purchase_claims (telegram_user_id, claim_status, submitted_at desc);

create index if not exists premium_purchase_claims_status_idx
  on public.premium_purchase_claims (claim_status, submitted_at desc);
