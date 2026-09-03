import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-ssr/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeSlug } from "@/lib/slug";

/**
 * Authentication and authorization.
 *
 * One rule runs through all of it: the *identity* comes from the session cookie
 * (verified by Supabase), and the *permissions* come from a fresh read of the
 * `accounts` row. Nothing trusts a claim carried in the request body, and no
 * role is ever read from a cookie.
 */

export type Role = "owner" | "staff" | "admin";

export interface Account {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: Role;
  status: "active" | "suspended";
  plan: string;
}

export interface Session {
  user: User;
  account: Account | null;
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    email: String(row.email),
    fullName: (row.full_name as string | null) ?? null,
    role: (row.role as Role) ?? "owner",
    status: (row.status as Account["status"]) ?? "active",
    plan: (row.plan as string) ?? "free",
  };
}

/**
 * The signed-in user and their account, or null.
 *
 * Uses `getUser()`, not `getSession()`: `getUser` revalidates the token against
 * Supabase, while `getSession` trusts whatever is in the cookie. For an
 * authorization decision that difference matters.
 */
export async function getSession(): Promise<Session | null> {
  const client = await supabaseServer();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;

  // Read the account with the service role: the account row is what decides
  // permissions, so it must not be filtered by the policies it feeds.
  const admin = supabaseAdmin();
  if (!admin) return { user: data.user, account: null };

  const { data: row } = await admin
    .from("accounts")
    .select("id, user_id, email, full_name, role, status, plan")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    user: data.user,
    account: row ? rowToAccount(row as Record<string, unknown>) : null,
  };
}

/** An active account, or null. A suspended account is treated as signed out. */
export async function getAccount(): Promise<Account | null> {
  const session = await getSession();
  if (!session?.account) return null;
  return session.account.status === "active" ? session.account : null;
}

export async function isStaff(): Promise<boolean> {
  const account = await getAccount();
  return account ? account.role === "staff" || account.role === "admin" : false;
}

export type PageAuth =
  | { ok: true; account: Account; staff: boolean; profileId: string; accountId: string | null }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * May the caller edit this page?
 *
 * Owner or staff, and the page must exist in the database — built-in seed pages
 * have no row and are not editable by anyone.
 */
export async function authorizePageEdit(slug: string): Promise<PageAuth> {
  const account = await getAccount();
  if (!account) {
    return { ok: false, status: 401, error: "Please sign in." };
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return { ok: false, status: 403, error: "This deployment has no database configured." };
  }

  // Exact match: a LIKE wildcard here would let `%` resolve to an arbitrary
  // page and hand the caller edit rights on it.
  const key = normalizeSlug(slug);
  if (!key) return { ok: false, status: 404, error: "Page not found." };

  const { data: row } = await admin
    .from("profiles")
    .select("id, account_id")
    .eq("slug", key)
    .maybeSingle();

  if (!row) {
    return { ok: false, status: 404, error: "Page not found." };
  }

  const staff = account.role === "staff" || account.role === "admin";
  const owns = row.account_id && String(row.account_id) === account.id;

  if (!staff && !owns) {
    return { ok: false, status: 403, error: "You don't have access to this page." };
  }

  return {
    ok: true,
    account,
    staff,
    profileId: String(row.id),
    accountId: (row.account_id as string | null) ?? null,
  };
}

/** Record a login timestamp. Best-effort; never blocks a request. */
export async function touchLastSeen(accountId: string): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;
  await admin
    .from("accounts")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", accountId)
    .then(undefined, () => {});
}
