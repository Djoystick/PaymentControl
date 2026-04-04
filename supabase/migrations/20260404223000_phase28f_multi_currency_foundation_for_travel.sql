-- Phase 28F: multi-currency foundation for travel expenses.
-- Keeps normalized trip-currency totals stable while preserving original amount/currency context.

alter table if exists public.travel_trip_expenses
  add column if not exists source_amount numeric(12, 2),
  add column if not exists source_currency char(3),
  add column if not exists conversion_rate numeric(12, 6);

update public.travel_trip_expenses
set source_amount = amount
where source_amount is null;

update public.travel_trip_expenses
set source_currency = currency
where source_currency is null;

update public.travel_trip_expenses
set conversion_rate = 1
where conversion_rate is null;

alter table if exists public.travel_trip_expenses
  alter column source_amount set not null,
  alter column source_currency set not null,
  alter column conversion_rate set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_expenses_source_amount_check'
      and conrelid = 'public.travel_trip_expenses'::regclass
  ) then
    alter table public.travel_trip_expenses
      add constraint travel_trip_expenses_source_amount_check
      check (source_amount > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_expenses_source_currency_check'
      and conrelid = 'public.travel_trip_expenses'::regclass
  ) then
    alter table public.travel_trip_expenses
      add constraint travel_trip_expenses_source_currency_check
      check (source_currency ~ '^[A-Z]{3}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_trip_expenses_conversion_rate_check'
      and conrelid = 'public.travel_trip_expenses'::regclass
  ) then
    alter table public.travel_trip_expenses
      add constraint travel_trip_expenses_conversion_rate_check
      check (conversion_rate > 0);
  end if;
end
$$;

