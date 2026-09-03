import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-ssr/server";
import { supabaseAdmin } from "@/lib/supabase";
import { safeNextPath } from "@/lib/redirect";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Send a sign-in link.
 *
 * Security properties, in order of importance:
 *
 *  1. **No self-signup.** `shouldCreateUser: false`, and we additionally require
 *     an active `accounts` row. Somebody who guesses a customer's email cannot
 *     create an account, and a suspended account gets no link.
 *  2. **No enumeration.** Every outcome returns the same 200 body, so this
 *     endpoint cannot be used to test which emails are customers.
 *  3. **Rate limited** per IP and per address, because sending mail is an
 *     abusable side effect.
 */

const Schema = z.object({
  email: z.string().email().max(160),
  next: z.string().max(200).optional(),
});

const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = HITS.get(key);
  if (!entry || now > entry.resetAt) {
    HITS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/** The one response every caller gets, whatever actually happened. */
const OPAQUE_OK = { ok: true } as const;

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const next = safeNextPath(parsed.data.next);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "anon";

  if (throttled(`ip:${ip}`) || throttled(`email:${email}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const admin = supabaseAdmin();
  const client = await supabaseServer();
  if (!admin || !client) {
    return NextResponse.json(
      { error: "Sign-in isn't configured on this deployment." },
      { status: 503 },
    );
  }

  // Only an existing, active account gets a link. Checked before sending so we
  // never email someone who isn't a customer.
  const { data: account } = await admin
    .from("accounts")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (!account || account.status !== "active") {
    // Deliberately indistinguishable from success.
    return NextResponse.json(OPAQUE_OK);
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Log for us, stay opaque to the caller.
    console.error("[auth] signInWithOtp failed", error.message);
  }

  return NextResponse.json(OPAQUE_OK);
}
