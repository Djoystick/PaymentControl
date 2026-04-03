-- Phase 26C: supporter badge foundation (recognition only, no access gating).

alter table public.profiles
  add column if not exists supporter_badge_active boolean not null default false;

alter table public.profiles
  add column if not exists supporter_badge_granted_at timestamptz;

alter table public.profiles
  add column if not exists supporter_badge_revoked_at timestamptz;

alter table public.profiles
  add column if not exists supporter_badge_note text;

alter table public.profiles
  add column if not exists supporter_badge_source text;

alter table public.profiles
  add column if not exists supporter_badge_granted_by_telegram_user_id text;

alter table public.profiles
  add column if not exists supporter_badge_revoked_by_telegram_user_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_note_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_note_check
      check (
        supporter_badge_note is null
        or char_length(supporter_badge_note) <= 280
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_source_check
      check (
        supporter_badge_source is null
        or char_length(trim(supporter_badge_source)) between 1 and 64
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_granted_by_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_granted_by_check
      check (
        supporter_badge_granted_by_telegram_user_id is null
        or supporter_badge_granted_by_telegram_user_id ~ '^[0-9]{5,20}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_revoked_by_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_revoked_by_check
      check (
        supporter_badge_revoked_by_telegram_user_id is null
        or supporter_badge_revoked_by_telegram_user_id ~ '^[0-9]{5,20}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_state_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_state_check
      check (
        supporter_badge_active = false
        or (
          supporter_badge_active = true
          and supporter_badge_granted_at is not null
          and supporter_badge_granted_by_telegram_user_id is not null
          and supporter_badge_revoked_at is null
          and supporter_badge_revoked_by_telegram_user_id is null
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_supporter_badge_revoked_after_granted_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supporter_badge_revoked_after_granted_check
      check (
        supporter_badge_revoked_at is null
        or (
          supporter_badge_granted_at is not null
          and supporter_badge_revoked_at >= supporter_badge_granted_at
        )
      );
  end if;
end $$;

create index if not exists profiles_supporter_badge_active_idx
  on public.profiles (supporter_badge_active)
  where supporter_badge_active = true;
