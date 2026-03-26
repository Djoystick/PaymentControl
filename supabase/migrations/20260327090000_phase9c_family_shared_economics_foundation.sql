alter table public.recurring_payment_cycles
  add column if not exists paid_by_profile_id uuid references public.profiles(id) on delete set null;
