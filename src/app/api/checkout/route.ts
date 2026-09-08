import { NextResponse } from "next/server";
import { z } from "zod";
import { hasStripe, priceIdFor, stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { slugIsTaken } from "@/lib/repo";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { clientIp, rateLimit } from "@/lib/security";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Start a purchase.
 *
 * The buyer picks their golodex.com/name here, so the slug is reserved before
 * they reach Stripe — otherwise two people can pay for the same name in the
 * seconds between choosing and checking out. The reservation expires in an
 * hour so an abandoned checkout does not hold a name forever.
 */

const Schema = z.object({
  slug: z.string().min(2).max(40),
  email: z.string().email().max(160),
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  if (!hasStripe) {
    return NextResponse.json(
      { error: "Checkout isn't configured on this deployment yet." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your details and try again." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const check = validateSlug(normalizeSlug(parsed.data.slug));
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 422 });
  }
  const slug = check.slug;

  if (await slugIsTaken(slug)) {
    return NextResponse.json({ error: `golodex.com/${slug} is already taken.` }, { status: 409 });
  }

  const admin = supabaseAdmin();
  const client = stripe();
  const price = priceIdFor(parsed.data.interval);
  if (!admin || !client || !price) {
    return NextResponse.json({ error: "Checkout is unavailable right now." }, { status: 503 });
  }

  // An existing account means they should sign in, not buy a second one.
  const { data: existing } = await admin
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "That email already has a Golodex account. Sign in instead.", signIn: true },
      { status: 409 },
    );
  }

  try {
    const session = await client.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      // The webhook provisions from this, so everything it needs travels here.
      metadata: { slug, email, interval: parsed.data.interval },
      subscription_data: { metadata: { slug, email } },
      success_url: `${env.siteUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/pricing?cancelled=1`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    // Reserve only once Stripe has a session to tie it to.
    const { data: reserved, error } = await admin.rpc("reserve_slug", {
      p_slug: slug,
      p_email: email,
      p_session_id: session.id,
      p_minutes: 60,
    });

    if (error) {
      console.error("[checkout] reserve_slug failed", error.message);
    } else if (reserved === false) {
      return NextResponse.json(
        { error: `golodex.com/${slug} was just taken. Try another name.` },
        { status: 409 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] session failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
