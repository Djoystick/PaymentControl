create extension if not exists pgcrypto;

create table if not exists public.recurring_payment_cycles (
  id uuid primary key default gen_random_uuid(),
  recurring_payment_id uuid not null references public.recurring_payments(id) on delete cascade,
  cycle_key text not null,
  due_date date not null,
  payment_state text not null default 'unpaid',
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recurring_payment_cycles_state_check check (payment_state in ('paid', 'unpaid'))
);

create unique index if not exists recurring_payment_cycles_unique
  on public.recurring_payment_cycles (recurring_payment_id, cycle_key);

create index if not exists recurring_payment_cycles_recurring_payment_idx
  on public.recurring_payment_cycles (recurring_payment_id);

create index if not exists recurring_payment_cycles_state_idx
  on public.recurring_payment_cycles (payment_state);
