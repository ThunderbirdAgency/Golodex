-- Golodex core schema
--
-- Design notes
--  * A page is one `profiles` row holding a JSONB document (theme + blocks).
--    Gifting a page from an external system is then a single INSERT, and the
--    public renderer is a single indexed lookup by slug.
--  * Leads are stored here first and pushed to GoHighLevel asynchronously, so a
--    GHL outage never costs the customer a lead.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- accounts

create table if not exists public.accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text,
  -- free | pro | business. Drives limits and GHL sub-account provisioning.
  plan         text not null default 'free',
  -- Set when this account was created by the gifting API rather than by signup.
  gifted_by    text,
  created_at   timestamptz not null default now()
);

create index if not exists accounts_email_idx on public.accounts (lower(email));

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid references public.accounts (id) on delete cascade,
  slug         text not null unique,
  -- draft | published | claimable ("gifted, nobody has logged in yet")
  status       text not null default 'draft',
  -- The full page document. Shape is `Profile` in src/lib/types.ts.
  doc          jsonb not null,
  -- Single-use token emailed with a gifted page so the recipient can claim it.
  claim_token  text unique,
  claimed_at   timestamptz,
  -- GoHighLevel sub-account this page's leads route into.
  ghl_location_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_account_idx on public.profiles (account_id);
create index if not exists profiles_status_idx  on public.profiles (status);

-- Slugs are case-insensitive and reserved words are blocked at the app layer.
create unique index if not exists profiles_slug_lower_idx on public.profiles (lower(slug));

-- ------------------------------------------------------------------- leads

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  block_id     text,
  name         text,
  email        text,
  phone        text,
  message      text,
  tags         text[] not null default '{}',
  source       text,
  referrer     text,
  user_agent   text,
  -- pending | synced | failed — the GHL push is retried off this column.
  sync_status  text not null default 'pending',
  sync_error   text,
  ghl_contact_id text,
  created_at   timestamptz not null default now()
);

create index if not exists leads_profile_idx on public.leads (profile_id, created_at desc);
create index if not exists leads_sync_idx    on public.leads (sync_status)
  where sync_status <> 'synced';

-- ------------------------------------------------------------------ events

create table if not exists public.events (
  id           bigserial primary key,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  -- view | click | save_contact | share
  kind         text not null,
  block_id     text,
  referrer     text,
  country      text,
  created_at   timestamptz not null default now()
);

create index if not exists events_profile_idx on public.events (profile_id, created_at desc);

-- --------------------------------------------------------------- api keys

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  -- sha256 of the key. The plaintext is shown once at creation and never stored.
  key_hash     text not null unique,
  -- Last 4 chars, so a key is identifiable in the UI.
  key_suffix   text not null,
  scopes       text[] not null default '{pages:write}',
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------- GHL provisioning

create table if not exists public.ghl_provisioning (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references public.profiles (id) on delete set null,
  account_id   uuid references public.accounts (id) on delete set null,
  -- pending | created | failed | skipped
  status       text not null default 'pending',
  location_id  text,
  snapshot_id  text,
  error        text,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ghl_provisioning_status_idx on public.ghl_provisioning (status);

-- ---------------------------------------------------------------- triggers

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------- RLS

alter table public.accounts         enable row level security;
alter table public.profiles         enable row level security;
alter table public.leads            enable row level security;
alter table public.events           enable row level security;
alter table public.api_keys         enable row level security;
alter table public.ghl_provisioning enable row level security;

-- Published pages are world-readable; that is the entire product.
drop policy if exists "published profiles are public" on public.profiles;
create policy "published profiles are public"
  on public.profiles for select
  using (status = 'published');

drop policy if exists "owners read own profiles" on public.profiles;
create policy "owners read own profiles"
  on public.profiles for select
  using (account_id in (select id from public.accounts where user_id = auth.uid()));

drop policy if exists "owners write own profiles" on public.profiles;
create policy "owners write own profiles"
  on public.profiles for update
  using (account_id in (select id from public.accounts where user_id = auth.uid()));

drop policy if exists "owners read own account" on public.accounts;
create policy "owners read own account"
  on public.accounts for select
  using (user_id = auth.uid());

drop policy if exists "owners read own leads" on public.leads;
create policy "owners read own leads"
  on public.leads for select
  using (
    profile_id in (
      select p.id from public.profiles p
      join public.accounts a on a.id = p.account_id
      where a.user_id = auth.uid()
    )
  );

drop policy if exists "owners read own events" on public.events;
create policy "owners read own events"
  on public.events for select
  using (
    profile_id in (
      select p.id from public.profiles p
      join public.accounts a on a.id = p.account_id
      where a.user_id = auth.uid()
    )
  );

-- api_keys and ghl_provisioning are service-role only: no policies, RLS on.
