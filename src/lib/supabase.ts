import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase, hasSupabaseAdmin } from "./env";

/** Anon client — subject to RLS. Safe for reads of published pages. */
export function supabasePublic(): SupabaseClient | null {
  if (!hasSupabase) return null;
  return createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS.
 * Server-only: never import this into a component that ships to the browser.
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (!hasSupabaseAdmin) return null;
  return createClient(env.supabaseUrl!, env.supabaseServiceKey!, {
    auth: { persistSession: false },
  });
}
