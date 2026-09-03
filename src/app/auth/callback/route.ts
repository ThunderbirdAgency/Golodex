import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-ssr/server";
import { supabaseAdmin } from "@/lib/supabase";
import { safeNextPath } from "@/lib/redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where a magic link lands.
 *
 * Two flows are accepted because magic links get opened on the wrong device all
 * the time:
 *
 *  - `?token_hash=…&type=…` — works from any device. This is the flow to prefer;
 *    it needs the Supabase email template to use `{{ .TokenHash }}`:
 *
 *      {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
 *
 *  - `?code=…` — Supabase's default PKCE flow. Only works in the browser that
 *    requested the link, because the code verifier lives in a cookie there.
 *
 * Every failure redirects back to /login with a short reason rather than
 * rendering an error page, so the recovery path is always "ask for a new link".
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = url.origin;

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  const client = await supabaseServer();
  if (!client) return fail("unavailable");

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  let userId: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user) return fail(classify(error?.message));
    userId = data.user.id;
  } else if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user) return fail(classify(error?.message));
    userId = data.user.id;
  } else {
    return fail("invalid");
  }

  // A valid Supabase session is not by itself authorization: this app requires
  // an active `accounts` row, and sends anyone without one back to /login.
  const admin = supabaseAdmin();
  if (admin && userId) {
    const { data: account } = await admin
      .from("accounts")
      .select("id, role, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!account) {
      await client.auth.signOut();
      return fail("no_account");
    }
    if (account.status !== "active") {
      await client.auth.signOut();
      return fail("suspended");
    }

    await admin
      .from("accounts")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", account.id)
      .then(undefined, () => {});

    // Staff land in the console; customers land on their own page.
    const landing =
      next !== "/dashboard"
        ? next
        : account.role === "owner"
          ? "/dashboard"
          : "/admin";
    return NextResponse.redirect(`${origin}${landing}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function classify(message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("expired")) return "expired";
  if (m.includes("already") || m.includes("used")) return "used";
  return "invalid";
}
