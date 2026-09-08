/**
 * What each plan unlocks.
 *
 * This file is the single source of truth. Pricing copy, checkout, plan gating
 * and the admin console all read from here, so changing what $25 buys is one
 * edit in one place rather than a hunt through the codebase.
 */

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  id: PlanId;
  label: string;
  /** Cents per month. `null` means the plan is not self-serve purchasable. */
  monthly: number | null;
  /** Cents per year. */
  yearly: number | null;
  tagline: string;
  /** Shown on the pricing page, in order. */
  features: string[];
  /** Absent from this plan — rendered struck through or omitted. */
  missing?: string[];

  limits: {
    /** How many pages one account may own. */
    pages: number;
    /** Is the AI assistant block usable? */
    aiAssistant: boolean;
    /**
     * Assistant replies per calendar month, across the account. A hard ceiling
     * on our own Anthropic spend: one page that gets shared widely must not be
     * able to cost more than the subscription brings in.
     */
    aiRepliesPerMonth: number;
    /** Own GoHighLevel sub-account rather than the shared one. */
    dedicatedCrm: boolean;
    /** Hide the "Made with Golodex" footer mark. */
    removeBranding: boolean;
    /** Blocks only available on paid plans. */
    premiumBlocks: boolean;
    /** Download leads as CSV. */
    leadExport: boolean;
    /** Point their own domain at the page (not yet implemented — see HANDOFF). */
    customDomain: boolean;
  };
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    label: "Free",
    monthly: 0,
    yearly: 0,
    tagline: "Everything you need to be found and saved.",
    features: [
      "Your own golodex.com/name",
      "Save-to-contacts card",
      "Print-ready QR code",
      "Links, socials and your story",
      "Contact form — enquiries by email",
    ],
    missing: ["AI assistant", "Leads into your own CRM", "Golodex badge removed"],
    limits: {
      pages: 1,
      aiAssistant: false,
      aiRepliesPerMonth: 0,
      dedicatedCrm: false,
      removeBranding: false,
      premiumBlocks: false,
      leadExport: false,
      customDomain: false,
    },
  },

  pro: {
    id: "pro",
    label: "Pro",
    // $25/mo, or $240/yr — a 20% discount on twelve months.
    monthly: 2500,
    yearly: 24000,
    tagline: "The full card, and an assistant that answers for you.",
    features: [
      "Everything in Free",
      "AI assistant that answers questions about you",
      "Listings, work examples and testimonials",
      "Leads pushed into your own CRM",
      "No Golodex badge",
      "Export your leads any time",
    ],
    limits: {
      pages: 1,
      aiAssistant: true,
      aiRepliesPerMonth: 500,
      dedicatedCrm: true,
      removeBranding: true,
      premiumBlocks: true,
      leadExport: true,
      customDomain: false,
    },
  },

  business: {
    id: "business",
    label: "Business",
    // Sold by conversation, not by checkout — teams need invoicing anyway.
    monthly: null,
    yearly: null,
    tagline: "For teams and brokerages.",
    features: [
      "Everything in Pro",
      "Multiple pages",
      "Your own domain",
      "Bulk page creation via API",
    ],
    limits: {
      pages: 25,
      aiAssistant: true,
      aiRepliesPerMonth: 5000,
      dedicatedCrm: true,
      removeBranding: true,
      premiumBlocks: true,
      leadExport: true,
      customDomain: true,
    },
  },
};

export type BillingInterval = "month" | "year";

export function planOf(id: string | null | undefined): PlanLimits {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

/** Blocks that require a paid plan. Free pages can hold them but not render. */
export const PREMIUM_BLOCK_TYPES = new Set(["listings", "work", "testimonial"]);

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** What a year costs monthly, for the "save 20%" line. */
export function yearlyAsMonthly(cents: number): string {
  return `$${Math.round(cents / 12 / 100)}`;
}
