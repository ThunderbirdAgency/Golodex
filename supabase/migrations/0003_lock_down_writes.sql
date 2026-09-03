-- Close two privilege-escalation paths that RLS policies alone did not.
--
-- The mistake in 0002 was assuming a row-scoped UPDATE policy is a sufficient
-- control. It is not: Supabase grants `ALL` on every table in `public` to
-- `anon` and `authenticated` by default, and a policy without a column-level
-- grant lets a caller update EVERY column of a row they own.
--
-- Two concrete consequences, both reachable with nothing but a signed-in
-- customer's own access token against PostgREST directly:
--
--   1. `accounts`: a customer could PATCH their own row with {"role":"admin"}.
--      `getSession()` reads the role straight back out of that row, so on the
--      next request they were staff — every account's details, every page's
--      builder, and the ability to re-role or suspend real admins. Setting
--      {"plan":"business"} was a free upgrade on the same primitive.
--
--   2. `profiles`: a customer could PATCH `doc` directly, which skips the
--      locked-block enforcement in the save route entirely — and could set
--      `status` or a `verified` badge they were never granted.
--
-- The fix is to make the API the only write path, enforced by the database
-- rather than by convention. Every write in this app already goes through the
-- service-role client (`supabaseAdmin()`); the session client is used only for
-- auth calls. So `authenticated` needs no write privilege at all.

-- --------------------------------------------------------------- revocations

-- `service_role` bypasses RLS and is unaffected by these revocations.
revoke insert, update, delete on public.accounts         from anon, authenticated;
revoke insert, update, delete on public.profiles         from anon, authenticated;
revoke insert, update, delete on public.leads            from anon, authenticated;
revoke insert, update, delete on public.events           from anon, authenticated;
revoke insert, update, delete on public.page_versions    from anon, authenticated;
revoke insert, update, delete on public.api_keys         from anon, authenticated;
revoke insert, update, delete on public.ghl_provisioning from anon, authenticated;

-- api_keys and ghl_provisioning are service-role-only in every respect.
revoke select on public.api_keys         from anon, authenticated;
revoke select on public.ghl_provisioning from anon, authenticated;

-- ------------------------------------------------------------ stale policies

-- These now grant nothing (the underlying privilege is gone), but leaving them
-- would misleadingly suggest customers can write these tables.
drop policy if exists "update own account"        on public.accounts;
drop policy if exists "write own or any as staff" on public.profiles;

-- Read paths are unchanged: published pages stay world-readable, and owners and
-- staff keep their SELECT policies from 0002.
