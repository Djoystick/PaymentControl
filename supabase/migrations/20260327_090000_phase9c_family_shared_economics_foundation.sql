alter table public.recurring_payment_cycles
  add column if not exists paid_by_profile_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_payment_cycles_paid_by_profile_id_fkey'
      and conrelid = 'public.recurring_payment_cycles'::regclass
  ) then
    alter table public.recurring_payment_cycles
      add constraint recurring_payment_cycles_paid_by_profile_id_fkey
      foreign key (paid_by_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists recurring_payment_cycles_paid_by_profile_idx
  on public.recurring_payment_cycles (paid_by_profile_id);
