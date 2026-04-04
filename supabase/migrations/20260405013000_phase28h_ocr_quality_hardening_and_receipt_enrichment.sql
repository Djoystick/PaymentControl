-- Phase 28H: OCR quality signaling + receipt draft enrichment for travel.

alter table if exists public.travel_receipt_drafts
  add column if not exists ocr_field_quality jsonb not null default '{}'::jsonb,
  add column if not exists ocr_parse_attempts integer not null default 0,
  add column if not exists ocr_last_attempt_at timestamptz,
  add column if not exists source_image_updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_receipt_drafts_ocr_parse_attempts_check'
      and conrelid = 'public.travel_receipt_drafts'::regclass
  ) then
    alter table public.travel_receipt_drafts
      add constraint travel_receipt_drafts_ocr_parse_attempts_check
      check (ocr_parse_attempts >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_receipt_drafts_ocr_field_quality_type_check'
      and conrelid = 'public.travel_receipt_drafts'::regclass
  ) then
    alter table public.travel_receipt_drafts
      add constraint travel_receipt_drafts_ocr_field_quality_type_check
      check (jsonb_typeof(ocr_field_quality) = 'object');
  end if;
end
$$;

create index if not exists travel_receipt_drafts_trip_attempt_idx
  on public.travel_receipt_drafts (trip_id, ocr_last_attempt_at desc);
