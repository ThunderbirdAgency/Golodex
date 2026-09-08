-- Billing, slug reservations, and AI usage accounting.

-- ------------------------------------------------------------------ billing

alter table public.accounts
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text unique,
  -- Mirrors Stripe: active | trialing | past_due | canceled | incomplete.
  add column if not exists subscription_status    text,
  add column if not exists billing_interval       text,
  -- When the paid period ends. A cancelled subscription keeps working until
  -- this passes, which is what the customer paid for.
  add column if not exists current_period_end     timestamptz;

create index if not exists accounts_stripe_customer_idx
  on public.accounts (stripe_customer_id);

-- --------------------------------------------------------- slug reservations

-- A slug is claimed at checkout, before the account exists. Without this, two
-- people could pay for the same name in the seconds between picking and paying.
create table if not exists public.slug_reservations (
  slug        text primary key,
  email       text not null,
  -- Stripe Checkout Session id, so the webhook can match payment to claim.
  session_id  text unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists slug_reservations_expiry_idx
  on public.slug_reservations (expires_at);

/**
 * Claim a slug, or fail.
 *
 * Atomic on purpose: the check and the insert must not be two statements, or a
 * race lets two buyers reserve the same name. Expired reservations are cleared
 * first so an abandoned checkout does not hold a name hostage.
 */
create or replace function public.reserve_slug(
  p_slug text,
  p_email text,
  p_session_id text,
  p_minutes int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.slug_reservations where expires_at < now();

  if exists (select 1 from public.profiles where slug = p_slug) then
    return false;
  end if;

  insert into public.slug_reservations (slug, email, session_id, expires_at)
  values (p_slug, p_email, p_session_id, now() + make_interval(mins => p_minutes))
  on conflict (slug) do nothing;

  return found;
end;
$$;

revoke all on function public.reserve_slug(text, text, text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------- ai usage

-- One row per account per month. The assistant checks this before calling
-- Anthropic, so a page that goes viral cannot cost more than it earns.
create table if not exists public.ai_usage (
  account_id  uuid not null references public.accounts (id) on delete cascade,
  -- First day of the month, in UTC.
  period      date not null,
  replies     int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (account_id, period)
);

/**
 * Count one assistant reply and report whether the account is still under its
 * cap. Increments and checks in a single statement so concurrent visitors on
 * the same page cannot both slip past the limit.
 */
create or replace function public.consume_ai_reply(p_account_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  used int;
begin
  insert into public.ai_usage (account_id, period, replies)
  values (p_account_id, date_trunc('month', now())::date, 1)
  on conflict (account_id, period)
    do update set replies = public.ai_usage.replies + 1, updated_at = now()
  returning replies into used;

  return used <= p_limit;
end;
$$;

revoke all on function public.consume_ai_reply(uuid, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------- RLS

alter table public.slug_reservations enable row level security;
alter table public.ai_usage          enable row level security;

-- Both are service-role only; no policies, and no grants to anon/authenticated.
revoke all on public.slug_reservations from anon, authenticated;
revoke all on public.ai_usage          from anon, authenticated;

-- Owners may see their own usage so the dashboard can show "412 of 500 used".
create policy "read own ai usage"
  on public.ai_usage for select
  using (account_id = public.current_account_id() or public.is_staff());

grant select on public.ai_usage to authenticated;
