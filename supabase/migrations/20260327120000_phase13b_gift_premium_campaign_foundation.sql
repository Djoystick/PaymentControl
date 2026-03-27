create extension if not exists pgcrypto;

create table if not exists public.premium_gift_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null unique,
  title text not null,
  campaign_status text not null default 'draft',
  total_quota integer not null,
  starts_at timestamptz,
  ends_at timestamptz,
  premium_duration_days integer not null default 30,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint premium_gift_campaigns_status_check
    check (campaign_status in ('draft', 'active', 'paused', 'ended')),
  constraint premium_gift_campaigns_quota_check
    check (total_quota > 0),
  constraint premium_gift_campaigns_duration_check
    check (premium_duration_days > 0),
  constraint premium_gift_campaigns_time_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists premium_gift_campaigns_status_idx
  on public.premium_gift_campaigns (campaign_status, starts_at, ends_at);

create table if not exists public.premium_gift_campaign_claims (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.premium_gift_campaigns(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  claim_code text not null,
  claim_status text not null,
  entitlement_id uuid references public.premium_entitlements(id) on delete set null,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint premium_gift_campaign_claims_status_check
    check (
      claim_status in (
        'granted',
        'rejected_invalid_code',
        'rejected_inactive_campaign',
        'rejected_outside_window',
        'rejected_quota_exhausted',
        'rejected_already_claimed'
      )
    )
);

create index if not exists premium_gift_campaign_claims_campaign_idx
  on public.premium_gift_campaign_claims (campaign_id, created_at desc);

create index if not exists premium_gift_campaign_claims_profile_idx
  on public.premium_gift_campaign_claims (profile_id, created_at desc);

create unique index if not exists premium_gift_campaign_claims_campaign_profile_granted_unique
  on public.premium_gift_campaign_claims (campaign_id, profile_id)
  where claim_status = 'granted';

create or replace function public.claim_premium_gift_campaign(
  p_campaign_code text,
  p_profile_id uuid,
  p_workspace_id uuid default null
)
returns table (
  claim_status text,
  claim_id uuid,
  campaign_id uuid,
  entitlement_id uuid,
  entitlement_granted boolean,
  quota_total integer,
  quota_used integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign premium_gift_campaigns%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_existing_grant_id uuid;
  v_granted_count integer := 0;
  v_claim_id uuid;
  v_entitlement_id uuid;
  v_campaign_code_normalized text := lower(trim(coalesce(p_campaign_code, '')));
  v_message text := '';
begin
  if v_campaign_code_normalized = '' then
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      null,
      p_profile_id,
      p_workspace_id,
      '',
      'rejected_invalid_code',
      'Gift campaign code is empty.'
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_invalid_code'::text,
        v_claim_id,
        null::uuid,
        null::uuid,
        false,
        0,
        0,
        'Gift campaign code is invalid.'::text;
    return;
  end if;

  select *
  into v_campaign
  from public.premium_gift_campaigns
  where lower(campaign_code) = v_campaign_code_normalized
  limit 1
  for update;

  if not found then
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      null,
      p_profile_id,
      p_workspace_id,
      v_campaign_code_normalized,
      'rejected_invalid_code',
      'Gift campaign code was not found.'
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_invalid_code'::text,
        v_claim_id,
        null::uuid,
        null::uuid,
        false,
        0,
        0,
        'Gift campaign code was not found.'::text;
    return;
  end if;

  select id
  into v_existing_grant_id
  from public.premium_gift_campaign_claims
  where campaign_id = v_campaign.id
    and profile_id = p_profile_id
    and claim_status = 'granted'
  order by created_at desc
  limit 1;

  select count(*)
  into v_granted_count
  from public.premium_gift_campaign_claims
  where campaign_id = v_campaign.id
    and claim_status = 'granted';

  if v_existing_grant_id is not null then
    v_message := 'Gift campaign was already claimed by this profile.';
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      v_campaign.id,
      p_profile_id,
      p_workspace_id,
      v_campaign.campaign_code,
      'rejected_already_claimed',
      v_message
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_already_claimed'::text,
        v_claim_id,
        v_campaign.id,
        null::uuid,
        false,
        v_campaign.total_quota,
        v_granted_count,
        v_message;
    return;
  end if;

  if v_campaign.campaign_status <> 'active' then
    v_message := 'Gift campaign is not active.';
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      v_campaign.id,
      p_profile_id,
      p_workspace_id,
      v_campaign.campaign_code,
      'rejected_inactive_campaign',
      v_message
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_inactive_campaign'::text,
        v_claim_id,
        v_campaign.id,
        null::uuid,
        false,
        v_campaign.total_quota,
        v_granted_count,
        v_message;
    return;
  end if;

  if (v_campaign.starts_at is not null and v_now < v_campaign.starts_at)
    or (v_campaign.ends_at is not null and v_now >= v_campaign.ends_at) then
    v_message := 'Gift campaign is outside active time window.';
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      v_campaign.id,
      p_profile_id,
      p_workspace_id,
      v_campaign.campaign_code,
      'rejected_outside_window',
      v_message
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_outside_window'::text,
        v_claim_id,
        v_campaign.id,
        null::uuid,
        false,
        v_campaign.total_quota,
        v_granted_count,
        v_message;
    return;
  end if;

  if v_granted_count >= v_campaign.total_quota then
    v_message := 'Gift campaign quota is exhausted.';
    insert into public.premium_gift_campaign_claims (
      campaign_id,
      profile_id,
      workspace_id,
      claim_code,
      claim_status,
      failure_reason
    )
    values (
      v_campaign.id,
      p_profile_id,
      p_workspace_id,
      v_campaign.campaign_code,
      'rejected_quota_exhausted',
      v_message
    )
    returning id into v_claim_id;

    return query
      select
        'rejected_quota_exhausted'::text,
        v_claim_id,
        v_campaign.id,
        null::uuid,
        false,
        v_campaign.total_quota,
        v_granted_count,
        v_message;
    return;
  end if;

  insert into public.premium_entitlements (
    scope,
    profile_id,
    workspace_id,
    entitlement_source,
    status,
    starts_at,
    ends_at,
    metadata
  )
  values (
    'profile',
    p_profile_id,
    null,
    'gift_campaign',
    'active',
    v_now,
    v_now + make_interval(days => v_campaign.premium_duration_days),
    jsonb_build_object(
      'campaign_id', v_campaign.id,
      'campaign_code', v_campaign.campaign_code,
      'campaign_title', v_campaign.title
    )
  )
  returning id into v_entitlement_id;

  insert into public.premium_gift_campaign_claims (
    campaign_id,
    profile_id,
    workspace_id,
    claim_code,
    claim_status,
    entitlement_id,
    failure_reason
  )
  values (
    v_campaign.id,
    p_profile_id,
    p_workspace_id,
    v_campaign.campaign_code,
    'granted',
    v_entitlement_id,
    null
  )
  returning id into v_claim_id;

  v_granted_count := v_granted_count + 1;
  v_message := 'Gift premium entitlement granted.';

  return query
    select
      'granted'::text,
      v_claim_id,
      v_campaign.id,
      v_entitlement_id,
      true,
      v_campaign.total_quota,
      v_granted_count,
      v_message;
end;
$$;
