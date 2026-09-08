import Stripe from "stripe";

/**
 * Stripe wiring.
 *
 * Price ids come from the environment rather than being looked up by amount:
 * matching on price would silently pick the wrong one the first time somebody
 * makes a second $25 product.
 */

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const stripeEnv = {
  secretKey: opt("STRIPE_SECRET_KEY"),
  webhookSecret: opt("STRIPE_WEBHOOK_SECRET"),
  priceMonthly: opt("STRIPE_PRICE_PRO_MONTHLY"),
  priceYearly: opt("STRIPE_PRICE_PRO_YEARLY"),
} as const;

export const hasStripe = Boolean(
  stripeEnv.secretKey && stripeEnv.priceMonthly && stripeEnv.priceYearly,
);

let client: Stripe | null = null;

export function stripe(): Stripe | null {
  if (!stripeEnv.secretKey) return null;
  if (!client) {
    client = new Stripe(stripeEnv.secretKey, {
      // Pinned: an unpinned version means Stripe can change response shapes
      // under a running deployment.
      apiVersion: "2026-08-26.dahlia",
      appInfo: { name: "Golodex", url: "https://golodex.com" },
    });
  }
  return client;
}

export function priceIdFor(interval: "month" | "year"): string | undefined {
  return interval === "year" ? stripeEnv.priceYearly : stripeEnv.priceMonthly;
}

/**
 * Does this subscription status entitle the customer to paid features?
 *
 * `past_due` deliberately counts: a failed card should not black out someone's
 * public page while Stripe is still retrying. Stripe moves it to `canceled`
 * when it gives up, and that is when access ends.
 */
export function isEntitled(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
