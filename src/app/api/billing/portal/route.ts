import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Send a customer to Stripe's billing portal.
 *
 * Card updates, invoices and cancellation all live there — building our own
 * would mean handling card data and getting dunning right, for no gain.
 */
export async function POST() {
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const client = stripe();
  const admin = supabaseAdmin();
  if (!client || !admin) {
    return NextResponse.json({ error: "Billing isn't configured." }, { status: 503 });
  }

  const { data } = await admin
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", account.id)
    .maybeSingle();

  const customerId = data?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: "There's no subscription on this account yet." },
      { status: 400 },
    );
  }

  try {
    const session = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.siteUrl}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing] portal failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not open billing." }, { status: 502 });
  }
}
