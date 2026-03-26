create extension if not exists pgcrypto;

create table if not exists public.reminder_dispatch_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid not null references public.recurring_payments(id) on delete cascade,
  reminder_reason text not null,
  cycle_due_date date not null,
  evaluation_date date not null,
  dispatch_status text not null,
  trigger_source text not null default 'manual_dispatch',
  triggered_by_profile_id uuid references public.profiles(id) on delete set null,
  recipient_telegram_user_id text,
  message_preview text,
  payload_snapshot jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reminder_dispatch_attempts_reason_check
    check (reminder_reason in ('due_today', 'advance', 'overdue')),
  constraint reminder_dispatch_attempts_status_check
    check (dispatch_status in ('sent', 'skipped', 'failed'))
);

create unique index if not exists reminder_dispatch_attempts_idempotency_unique
  on public.reminder_dispatch_attempts (
    workspace_id,
    payment_id,
    reminder_reason,
    cycle_due_date,
    evaluation_date
  );

create index if not exists reminder_dispatch_attempts_workspace_created_idx
  on public.reminder_dispatch_attempts (workspace_id, created_at desc);
