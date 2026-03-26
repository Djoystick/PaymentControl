alter table public.recurring_payments
  add column if not exists is_subscription boolean not null default false;

create index if not exists recurring_payments_workspace_subscription_idx
  on public.recurring_payments (workspace_id, is_subscription, status);
