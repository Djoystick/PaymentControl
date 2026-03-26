create extension if not exists pgcrypto;

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'USD',
  category text not null,
  cadence text not null,
  due_day smallint not null,
  status text not null default 'active',
  is_required boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recurring_payments_amount_check check (amount > 0),
  constraint recurring_payments_cadence_check check (cadence in ('weekly', 'monthly')),
  constraint recurring_payments_status_check check (status in ('active', 'archived')),
  constraint recurring_payments_due_day_check check (
    (cadence = 'weekly' and due_day between 1 and 7)
    or (cadence = 'monthly' and due_day between 1 and 31)
  )
);

create index if not exists recurring_payments_workspace_id_idx
  on public.recurring_payments (workspace_id);

create index if not exists recurring_payments_workspace_status_idx
  on public.recurring_payments (workspace_id, status);
