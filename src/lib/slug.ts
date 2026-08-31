/** Slug rules for golodex.com/<slug>. */

/**
 * Paths the app itself owns, plus a few we never want a customer to hold
 * (impersonation risk, or a route we expect to add).
 */
export const RESERVED_SLUGS = new Set([
  "api", "app", "admin", "dashboard", "login", "logout", "signup", "signin",
  "auth", "claim", "settings", "account", "billing", "pricing", "about",
  "contact", "support", "help", "docs", "blog", "legal", "privacy", "terms",
  "static", "_next", "assets", "public", "images", "img", "fonts", "favicon",
  "robots", "sitemap", "well-known", "vcard", "embed", "og", "new", "edit",
  "golodex", "thunderbird", "root", "www", "mail", "cdn", "status",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export type SlugCheck = { ok: true; slug: string } | { ok: false; reason: string };

export function validateSlug(input: string): SlugCheck {
  const slug = normalizeSlug(input);
  if (slug.length < 2) return { ok: false, reason: "Must be at least 2 characters." };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, reason: "Use letters, numbers and hyphens only." };
  }
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: "That name is reserved." };
  return { ok: true, slug };
}

/**
 * Derive a starting slug from a person's name, e.g. "Erik Miller" -> "erikmiller".
 * Callers must still check availability.
 */
export function slugFromName(name: string): string {
  const base = normalizeSlug(name).replace(/-/g, "");
  return base.length >= 2 ? base : "";
}
