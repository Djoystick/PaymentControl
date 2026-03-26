do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'reminder_dispatch_attempts_reason_check'
      and conrelid = 'public.reminder_dispatch_attempts'::regclass
  ) then
    alter table public.reminder_dispatch_attempts
      drop constraint reminder_dispatch_attempts_reason_check;
  end if;

  alter table public.reminder_dispatch_attempts
    add constraint reminder_dispatch_attempts_reason_check
    check (reminder_reason in ('due_today', 'advance', 'overdue', 'test_send'));
end $$;
