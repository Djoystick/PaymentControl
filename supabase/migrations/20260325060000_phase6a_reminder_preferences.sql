alter table public.recurring_payments
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists remind_days_before smallint not null default 1,
  add column if not exists remind_on_due_day boolean not null default true,
  add column if not exists remind_on_overdue boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_payments_remind_days_before_check'
      and conrelid = 'public.recurring_payments'::regclass
  ) then
    alter table public.recurring_payments
      add constraint recurring_payments_remind_days_before_check
      check (remind_days_before in (0, 1, 3));
  end if;
end $$;
