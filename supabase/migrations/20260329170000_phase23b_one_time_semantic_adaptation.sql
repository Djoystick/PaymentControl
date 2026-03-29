alter table public.premium_purchase_claims
  alter column claim_rail set default 'one_time_premium',
  alter column expected_tier set default 'premium_one_time';

alter table public.premium_purchase_claims
  drop constraint if exists premium_purchase_claims_rail_check;

alter table public.premium_purchase_claims
  add constraint premium_purchase_claims_rail_check
    check (claim_rail in ('one_time_premium', 'boosty_premium'));

alter table public.premium_purchase_intents
  alter column intent_rail set default 'one_time_premium',
  alter column expected_tier set default 'premium_one_time';

alter table public.premium_purchase_intents
  drop constraint if exists premium_purchase_intents_rail_check;

alter table public.premium_purchase_intents
  add constraint premium_purchase_intents_rail_check
    check (intent_rail in ('one_time_premium', 'boosty_premium'));

alter table public.premium_entitlements
  drop constraint if exists premium_entitlements_source_check;

alter table public.premium_entitlements
  add constraint premium_entitlements_source_check
    check (entitlement_source in ('manual_admin', 'one_time_purchase', 'boosty', 'gift_campaign'));
