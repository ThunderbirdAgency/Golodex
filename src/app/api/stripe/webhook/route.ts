import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe, stripeEnv, isEntitled } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { createProfile, slugIsTaken } from "@/lib/repo";
import { buildProfile, resolveTheme } from "@/lib/pagebuilder";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Where a payment becomes a working account.
 *
 * Stripe is the source of truth for entitlement — never the client, and never
 * the success page, which a buyer can reach by URL without paying. Three rules
 * shape this handler:
 *
 *  1. **Verify the signature.** An unsigned webhook endpoint is an open door to
 *     free accounts for anyone who can POST.
 *  2. **Be idempotent.** Stripe retries, and delivers out of order. Every step
 *     checks whether it already happened.
 *  3. **Never fail after the money moved.** If page creation fails we still
 *     record the paid account, so the customer exists and support can finish
 *     the job. Returning a 500 to Stripe just replays the whole thing.
 */

export async function POST(req: Request) {
  const client = stripe();
  const secret = stripeEnv.webhookSecret;

  if (!client || !secret) {
    console.error("[stripe] webhook hit but Stripe is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // The raw body is required: any parsing changes the bytes and breaks the HMAC.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await client.webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error("[stripe] bad signature", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await onSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;

      default:
        // Everything else is acknowledged so Stripe stops retrying it.
        break;
    }
  } catch (err) {
    console.error(`[stripe] handler failed for ${event.type}`, err instanceof Error ? err.message : err);
    // 500 asks Stripe to retry. Correct for a transient database blip.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ------------------------------------------------------------- provisioning */

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const admin = supabaseAdmin();
  if (!admin) throw new Error("No database configured.");

  const email = (session.customer_details?.email ?? session.metadata?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Checkout session carried no email.");

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  // --- account (idempotent) ------------------------------------------------
  const { data: existing } = await admin
    .from("accounts")
    .select("id, user_id")
    .eq("email", email)
    .maybeSingle();

  let accountId: string;

  if (existing) {
    accountId = String(existing.id);
    await admin
      .from("accounts")
      .update({
        plan: "pro",
        status: "active",
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        subscription_status: "active",
        billing_interval: session.metadata?.interval ?? null,
      })
      .eq("id", accountId);
  } else {
    // Create the login. `inviteUserByEmail` also sends the sign-in link, which
    // is exactly the welcome email a new customer needs.
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/auth/callback?next=%2Fdashboard`,
    });

    if (inviteError || !invited.user) {
      throw new Error(`Could not create the login: ${inviteError?.message ?? "unknown"}`);
    }

    const { data: created, error: accountError } = await admin
      .from("accounts")
      .insert({
        user_id: invited.user.id,
        email,
        full_name: session.customer_details?.name ?? null,
        plan: "pro",
        role: "owner",
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        subscription_status: "active",
        billing_interval: session.metadata?.interval ?? null,
      })
      .select("id")
      .single();

    if (accountError || !created) {
      throw new Error(`Could not create the account: ${accountError?.message ?? "unknown"}`);
    }
    accountId = String(created.id);
  }

  // --- their page ----------------------------------------------------------
  // Past this point the money has moved and the account exists. Failures here
  // are logged, never thrown: replaying the whole webhook would be worse.
  try {
    const requested = normalizeSlug(
      session.metadata?.slug ?? email.split("@")[0] ?? "",
    );
    const check = validateSlug(requested);
    if (!check.ok) return;

    const { data: alreadyHasPage } = await admin
      .from("profiles")
      .select("id")
      .eq("account_id", accountId)
      .maybeSingle();
    if (alreadyHasPage) return;

    if (await slugIsTaken(check.slug)) {
      console.error(`[stripe] slug ${check.slug} taken by the time payment landed`);
      return;
    }

    const displayName = session.customer_details?.name?.trim() || check.slug;
    const doc = buildProfile(check.slug, { displayName, email }, "slate");
    doc.theme = resolveTheme("slate");

    await createProfile({
      slug: check.slug,
      doc,
      status: "published",
      accountId,
    });

    await admin.from("slug_reservations").delete().eq("slug", check.slug);
  } catch (err) {
    console.error("[stripe] page provisioning failed", err instanceof Error ? err.message : err);
  }
}

/** Keep our copy of the subscription in step with Stripe's. */
async function onSubscriptionChanged(subscription: Stripe.Subscription) {
  const admin = supabaseAdmin();
  if (!admin) throw new Error("No database configured.");

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const entitled = isEntitled(subscription.status);
  const periodEnd = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  const { error } = await admin
    .from("accounts")
    .update({
      // Losing the subscription drops them to Free rather than locking them
      // out: their page stays up, the paid extras switch off. Deleting
      // somebody's public page because a card expired would be indefensible.
      plan: entitled ? "pro" : "free",
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("stripe_customer_id", customerId);

  if (error) throw new Error(`Could not sync the subscription: ${error.message}`);
}
