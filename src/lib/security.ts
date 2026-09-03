/**
 * Shared security primitives.
 *
 * Each function here exists because of a specific reachable problem, noted
 * inline. Prefer these over ad-hoc checks at call sites.
 */

/* ------------------------------------------------------------------- rate */

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Bucket>();

/**
 * Fixed-window limiter.
 *
 * Per-instance and in-memory: it blunts casual abuse and runaway clients, but a
 * serverless deployment runs many instances, so the real ceiling is
 * `limit x instances`. Anything that must hold globally needs a shared store
 * (Upstash/Redis) — this is deliberately the cheap layer, not the only one.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = BUCKETS.get(key);

  if (!bucket || now > bucket.resetAt) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic sweep so the map cannot grow without bound.
    if (BUCKETS.size > 5000) {
      for (const [k, v] of BUCKETS) if (now > v.resetAt) BUCKETS.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client address. Spoofable, so never use it for authorization. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}

/* ------------------------------------------------------------------- URLs */

/**
 * A URL safe to put in an `iframe`/`video` `src`.
 *
 * `new URL()` happily parses `javascript:alert(1)`, and an iframe with a
 * `javascript:` src executes it — so page content, which is user-authored,
 * could otherwise inject script into a visitor's browser. Only http(s) passes.
 */
export function safeFrameSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * A URL safe for an `img` `src`. http(s) and data:image only — a `data:`
 * that isn't an image is a way to smuggle other content types.
 */
export function safeImageSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    if (u.protocol === "data:" && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(url)) {
      return url;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/* --------------------------------------------------------------- database */

/**
 * Escape a value used inside a PostgREST `LIKE`/`ILIKE` pattern.
 *
 * `%` and `_` are wildcards, and PostgREST additionally treats `,` `.` `(` `)`
 * as filter syntax — so raw user input in a pattern can both widen a match and
 * restructure the filter. Callers that want an exact match should use `.eq()`
 * on a normalized value instead of a pattern at all.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Strip everything PostgREST treats as syntax from a free-text search term,
 * for use inside an `.or()` filter string.
 */
export function sanitizeSearchTerm(value: string, maxLength = 60): string {
  return value
    .replace(/[,.()\\%_*:"'\s]+/g, " ")
    .trim()
    .slice(0, maxLength);
}
