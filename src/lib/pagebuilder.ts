import type { Block, Profile, SocialPlatform, Theme } from "./types";
import { DEFAULT_THEME, themeFromPreset } from "./themes";

/**
 * Turn a minimal description of a person into a complete, well-composed page.
 *
 * This exists for the gifting flow: an external system should be able to send
 * a name, a phone number and a booking link and get back a page that looks
 * deliberately designed — not an empty shell the recipient has to finish.
 */

export interface QuickPageInput {
  displayName: string;
  headline?: string;
  bio?: string;
  avatar?: string;
  cover?: string;
  logo?: string;

  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  organization?: string;
  title?: string;
  license?: string;

  /** Booking link — GHL calendar, Calendly, Cal.com. Rendered as the hero CTA. */
  calendarUrl?: string;
  /** Secondary conversion link, e.g. a mortgage application or valuation tool. */
  primaryActionUrl?: string;
  primaryActionLabel?: string;

  socials?: Partial<Record<SocialPlatform, string>>;

  /** Include the inline "send me a question" form. Defaults to true. */
  leadForm?: boolean;
  leadFormTitle?: string;
  leadTags?: string[];

  disclosure?: string;
}

/** Resolve a theme from a preset name, a full theme object, or a fallback. */
export function resolveTheme(input?: string | Partial<Theme>): Theme {
  if (typeof input === "string") {
    return themeFromPreset(input) ?? DEFAULT_THEME;
  }
  if (input && typeof input === "object") {
    const base = (input.preset ? themeFromPreset(input.preset) : null) ?? DEFAULT_THEME;
    return { ...base, ...input } as Theme;
  }
  return DEFAULT_THEME;
}

const SOCIAL_ORDER: SocialPlatform[] = [
  "instagram", "facebook", "tiktok", "youtube", "linkedin",
  "x", "threads", "pinterest", "zillow", "whatsapp", "website",
];

/**
 * Compose the block list.
 *
 * Order is the opinionated part: socials for recognition, then the single
 * highest-intent action, then supporting links, then the form as a catch-all
 * for visitors who will not book but will still raise their hand.
 */
export function buildBlocks(input: QuickPageInput): Block[] {
  const blocks: Block[] = [];

  const socials = Object.entries(input.socials ?? {})
    .filter(([, url]) => Boolean(url))
    .map(([platform, url]) => ({ platform: platform as SocialPlatform, url: url as string }))
    .sort((a, b) => SOCIAL_ORDER.indexOf(a.platform) - SOCIAL_ORDER.indexOf(b.platform));

  if (socials.length) {
    blocks.push({ id: "socials", type: "socials", items: socials });
  }

  if (input.calendarUrl) {
    blocks.push({
      id: "book",
      type: "link",
      label: "Book a call",
      subtitle: "Pick a time that works for you",
      icon: "calendar",
      badge: "Start here",
      featured: true,
      url: input.calendarUrl,
    });
  }

  if (input.primaryActionUrl) {
    blocks.push({
      id: "primary-action",
      type: "link",
      label: input.primaryActionLabel ?? "Get started",
      icon: "external",
      // Only promote this to featured when there is no booking link above it,
      // so a page never shows two competing primary buttons.
      featured: !input.calendarUrl,
      url: input.primaryActionUrl,
    });
  }

  if (input.phone) {
    blocks.push({
      id: "call",
      type: "link",
      label: "Call or text me",
      subtitle: input.phone,
      icon: "phone",
      url: `tel:${input.phone.replace(/[^\d+]/g, "")}`,
    });
  }

  if (input.email) {
    blocks.push({
      id: "email",
      type: "link",
      label: "Email me",
      subtitle: input.email,
      icon: "mail",
      url: `mailto:${input.email}`,
    });
  }

  if (input.website) {
    blocks.push({
      id: "website",
      type: "link",
      label: "Visit my website",
      subtitle: input.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      icon: "globe",
      url: input.website,
    });
  }

  if (input.leadForm !== false) {
    blocks.push({
      id: "leadform",
      type: "leadform",
      title: input.leadFormTitle ?? "Have a question?",
      description: "Send it over and I'll get back to you personally.",
      submitLabel: "Send",
      fields: ["name", "email", "phone", "message"],
      tags: input.leadTags ?? [],
    });
  }

  return blocks;
}

export function buildProfile(
  slug: string,
  input: QuickPageInput,
  theme?: string | Partial<Theme>,
  blocks?: Block[],
): Profile {
  const [first, ...rest] = input.displayName.trim().split(/\s+/);

  return {
    id: slug,
    slug,
    displayName: input.displayName.trim(),
    headline: input.headline,
    bio: input.bio,
    avatar: input.avatar,
    cover: input.cover,
    logo: input.logo,
    theme: resolveTheme(theme),
    blocks: blocks ?? buildBlocks(input),
    contact: {
      firstName: first,
      lastName: rest.length ? rest.join(" ") : undefined,
      organization: input.organization,
      title: input.title ?? input.headline,
      phone: input.phone,
      email: input.email,
      website: input.website,
      address: input.address,
      license: input.license,
    },
    disclosure: input.disclosure,
    seo: {
      title: `${input.displayName}${input.headline ? ` · ${input.headline}` : ""}`,
      description: input.bio,
    },
    status: "published",
  };
}
