-- Phase 28G: travel receipt capture drafts + OCR prefill assistant foundation.

create table if not exists public.travel_receipt_drafts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.travel_trips(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft',
  image_data_url text not null,
  image_mime_type text not null,
  image_file_name text,
  ocr_raw_text text,
  ocr_suggested_amount numeric(12, 2),
  ocr_suggested_currency char(3),
  ocr_suggested_spent_at timestamptz,
  ocr_suggested_merchant text,
  ocr_suggested_description text,
  ocr_suggested_category text,
  ocr_suggested_conversion_rate numeric(12, 6),
  ocr_last_error text,
  parsed_at timestamptz,
  finalized_at timestamptz,
  finalized_expense_id uuid references public.travel_trip_expenses(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint travel_receipt_drafts_status_check check (
    status in ('draft', 'parsed', 'ocr_failed', 'finalized')
  ),
  constraint travel_receipt_drafts_image_data_check check (
    image_data_url like 'data:image/%' and char_length(image_data_url) <= 7340032
  ),
  constraint travel_receipt_drafts_image_mime_check check (
    image_mime_type like 'image/%' and char_length(image_mime_type) <= 120
  ),
  constraint travel_receipt_drafts_image_file_name_check check (
    image_file_name is null or char_length(image_file_name) <= 180
  ),
  constraint travel_receipt_drafts_ocr_amount_check check (
    ocr_suggested_amount is null or ocr_suggested_amount > 0
  ),
  constraint travel_receipt_drafts_ocr_currency_check check (
    ocr_suggested_currency is null or ocr_suggested_currency ~ '^[A-Z]{3}$'
  ),
  constraint travel_receipt_drafts_ocr_merchant_check check (
    ocr_suggested_merchant is null or char_length(ocr_suggested_merchant) <= 240
  ),
  constraint travel_receipt_drafts_ocr_description_check check (
    ocr_suggested_description is null or char_length(ocr_suggested_description) <= 240
  ),
  constraint travel_receipt_drafts_ocr_category_check check (
    ocr_suggested_category is null or char_length(ocr_suggested_category) <= 80
  ),
  constraint travel_receipt_drafts_ocr_rate_check check (
    ocr_suggested_conversion_rate is null or ocr_suggested_conversion_rate > 0
  ),
  constraint travel_receipt_drafts_ocr_raw_text_check check (
    ocr_raw_text is null or char_length(ocr_raw_text) <= 8000
  ),
  constraint travel_receipt_drafts_finalized_state_check check (
    (status = 'finalized' and finalized_expense_id is not null and finalized_at is not null)
    or (status <> 'finalized' and finalized_expense_id is null)
  )
);

create index if not exists travel_receipt_drafts_trip_status_idx
  on public.travel_receipt_drafts (trip_id, status, created_at desc);

create index if not exists travel_receipt_drafts_workspace_status_idx
  on public.travel_receipt_drafts (workspace_id, status, updated_at desc);

create unique index if not exists travel_receipt_drafts_finalized_expense_unique
  on public.travel_receipt_drafts (finalized_expense_id)
  where finalized_expense_id is not null;
