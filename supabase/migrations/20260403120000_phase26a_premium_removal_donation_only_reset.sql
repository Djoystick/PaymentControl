-- Phase 26A: remove Premium domain and keep donation-only product model.
-- WARNING: this migration is destructive for all Premium historical data.

drop function if exists public.claim_premium_gift_campaign(text, uuid, uuid);

drop table if exists public.premium_purchase_intents cascade;
drop table if exists public.premium_purchase_claims cascade;
drop table if exists public.premium_gift_campaign_claims cascade;
drop table if exists public.premium_gift_campaigns cascade;
drop table if exists public.premium_entitlements cascade;
