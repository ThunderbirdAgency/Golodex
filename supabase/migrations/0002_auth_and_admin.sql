-- Auth, roles, and the safety net for client self-service.
--
-- Three things happen here:
--   1. Accounts get a role, so staff can administer every page from one login
--      while a customer only ever sees their own.
--   2. Every save snapshots the previous document, so "I broke my page" is a
--      one-click restore instead of a support ticket.
--   3. RLS is rewritten around a SECURITY DEFINER `is_staff()` helper. The
--      previous policies referenced `accounts` from inside an `accounts` policy,
--      which recurses.

-- ------------------------------------------------------------------ accounts

alter table public.accounts
  add column if not exists role text not null default 'owner',
  add column if not exists status text not null default 'active',
  add column if not exists last_seen_at timestamptz,
  -- Free-text note only staff can see, e.g. "gifted at Q3 mailer, called 4/12".
  add column if not exists staff_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_role_check'
  ) then
    alter table public.accounts
      add constraint accounts_role_check check (role in ('owner', 'staff', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'accounts_status_check'
  ) then
    alter table public.accounts
      add constraint accounts_status_check check (status in ('active', 'suspended'));
  end if;
end $$;

-- One account row per auth user, looked up on every authenticated request.
create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists accounts_role_idx on public.accounts (role) where role <> 'owner';

-- ------------------------------------------------------------- page versions

-- The undo button of last resort. A snapshot is written before every save, so
-- a client who deletes something important can get it back themselves.
create table if not exists public.page_versions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  doc          jsonb not null,
  -- Who saved the version this snapshot replaced.
  saved_by     uuid references public.accounts (id) on delete set null,
  -- 'owner' | 'staff' | 'api' — how the change arrived.
  source       text not null default 'owner',
  created_at   timestamptz not null default now()
);

create index if not exists page_versions_profile_idx
  on public.page_versions (profile_id, created_at desc);

-- ------------------------------------------------------------------ helpers

-- SECURITY DEFINER so it can read `accounts` without tripping that table's own
-- RLS — the reason the v1 policies recursed. `search_path` is pinned because a
-- definer function inherits the caller's path otherwise.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.accounts
    where user_id = auth.uid()
      and role in ('staff', 'admin')
      and status = 'active'
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

/** The caller's own account id, or null. */
create or replace function public.current_account_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select id from public.accounts where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_account_id() from public;
grant execute on function public.current_account_id() to authenticated;

-- Snapshot the outgoing document whenever `doc` actually changes.
create or replace function public.snapshot_page_version()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.doc is distinct from new.doc then
    insert into public.page_versions (profile_id, doc, saved_by, source)
    values (old.id, old.doc, public.current_account_id(),
            case when public.is_staff() then 'staff' else 'owner' end);

    -- Keep the twenty most recent; this is a safety net, not an audit log.
    delete from public.page_versions
    where profile_id = old.id
      and id not in (
        select id from public.page_versions
        where profile_id = old.id
        order by created_at desc
        limit 20
      );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_snapshot on public.profiles;
create trigger profiles_snapshot before update on public.profiles
  for each row execute function public.snapshot_page_version();

-- ---------------------------------------------------------------------- RLS

alter table public.page_versions enable row level security;

-- accounts ------------------------------------------------------------------
drop policy if exists "owners read own account" on public.accounts;
create policy "read own account"
  on public.accounts for select
  using (user_id = auth.uid() or public.is_staff());

create policy "update own account"
  on public.accounts for update
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

-- profiles ------------------------------------------------------------------
drop policy if exists "published profiles are public" on public.profiles;
create policy "published profiles are public"
  on public.profiles for select
  using (status = 'published');

drop policy if exists "owners read own profiles" on public.profiles;
create policy "read own or any as staff"
  on public.profiles for select
  using (account_id = public.current_account_id() or public.is_staff());

drop policy if exists "owners write own profiles" on public.profiles;
create policy "write own or any as staff"
  on public.profiles for update
  using (account_id = public.current_account_id() or public.is_staff())
  with check (account_id = public.current_account_id() or public.is_staff());

-- leads ---------------------------------------------------------------------
drop policy if exists "owners read own leads" on public.leads;
create policy "read own leads or any as staff"
  on public.leads for select
  using (
    public.is_staff()
    or profile_id in (
      select id from public.profiles where account_id = public.current_account_id()
    )
  );

-- events --------------------------------------------------------------------
drop policy if exists "owners read own events" on public.events;
create policy "read own events or any as staff"
  on public.events for select
  using (
    public.is_staff()
    or profile_id in (
      select id from public.profiles where account_id = public.current_account_id()
    )
  );

-- page_versions -------------------------------------------------------------
create policy "read own versions or any as staff"
  on public.page_versions for select
  using (
    public.is_staff()
    or profile_id in (
      select id from public.profiles where account_id = public.current_account_id()
    )
  );
