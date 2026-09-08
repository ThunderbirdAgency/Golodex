import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/security";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Turn a gifted page into an account its recipient controls.
 *
 * The token is the only credential, so it is consumed atomically: the update
 * that sets `claimed_at` is conditioned on it still being null, which is what
 * stops the same link being redeemed twice.
 */

const Schema = z.object({
  token: z.string().min(10).max(200),
  email: z.string().email().max(160),
  fullName: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  if (!rateLimit(`claim:${clientIp(req)}`, 8, 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your details." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const email = parsed.data.email.trim().toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, slug, account_id, claimed_at")
    .eq("claim_token", parsed.data.token)
    .maybeSingle();

  if (!profile || profile.claimed_at) {
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  }

  // Reuse an existing account for this email rather than creating a second one.
  const { data: existing } = await admin
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let accountId: string;

  if (existing) {
    accountId = String(existing.id);
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/auth/callback?next=%2Fdashboard`,
    });
    if (inviteError || !invited.user) {
      console.error("[claim] invite failed", inviteError?.message);
      return NextResponse.json({ error: "Could not send your sign-in link." }, { status: 502 });
    }

    const { data: created, error: accountError } = await admin
      .from("accounts")
      .insert({
        user_id: invited.user.id,
        email,
        full_name: parsed.data.fullName,
        plan: "free",
        role: "owner",
        gifted_by: "claim-link",
      })
      .select("id")
      .single();

    if (accountError || !created) {
      await admin.auth.admin.deleteUser(invited.user.id).catch(() => {});
      console.error("[claim] account insert failed", accountError?.message);
      return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
    }
    accountId = String(created.id);
  }

  // Conditioned on `claimed_at` still being null — this is what makes the token
  // single-use even if two requests arrive together.
  const { data: claimed, error: claimError } = await admin
    .from("profiles")
    .update({
      account_id: accountId,
      claimed_at: new Date().toISOString(),
      claim_token: null,
      status: "published",
    })
    .eq("id", profile.id)
    .is("claimed_at", null)
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) {
    return NextResponse.json({ error: "This link was just used." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, slug: profile.slug });
}
