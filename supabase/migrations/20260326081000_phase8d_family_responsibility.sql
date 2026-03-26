alter table public.recurring_payments
  add column if not exists responsible_profile_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_payments_responsible_profile_id_fkey'
      and conrelid = 'public.recurring_payments'::regclass
  ) then
    alter table public.recurring_payments
      add constraint recurring_payments_responsible_profile_id_fkey
      foreign key (responsible_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists recurring_payments_workspace_responsible_profile_idx
  on public.recurring_payments (workspace_id, responsible_profile_id);
