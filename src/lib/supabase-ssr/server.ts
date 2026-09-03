import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, hasSupabase } from "@/lib/env";

/**
 * Request-scoped Supabase client that reads and writes the session cookies.
 *
 * Use this for anything that depends on *who is asking*. `supabaseAdmin()` in
 * `lib/supabase.ts` bypasses RLS and must never be used to answer an
 * authorization question.
 */
export async function supabaseServer() {
  if (!hasSupabase) return null;
  const store = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
