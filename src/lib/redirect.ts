/**
 * Post-login redirect safety.
 *
 * A `next` parameter is attacker-controlled, so it is never used as a URL —
 * only as a same-site path. Anything else (absolute URLs, protocol-relative
 * `//evil.com`, backslash tricks) falls back to the dashboard. This is the
 * whole defence against an open redirect on the auth flow.
 */

const ALLOWED_PREFIXES = ["/dashboard", "/admin", "/edit"];

export function safeNextPath(value: string | undefined | null): string {
  if (!value) return "/dashboard";

  let candidate = value.trim();
  if (!candidate.startsWith("/")) return "/dashboard";
  // `//host` and `/\host` are both treated as protocol-relative by browsers.
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return "/dashboard";
  if (candidate.includes("\\")) return "/dashboard";

  // Strip any query or fragment; only the path is honoured.
  candidate = candidate.split("?")[0].split("#")[0];

  if (!ALLOWED_PREFIXES.some((p) => candidate === p || candidate.startsWith(`${p}/`))) {
    return "/dashboard";
  }
  return candidate;
}
