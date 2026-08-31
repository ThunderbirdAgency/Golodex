/**
 * Environment access with an explicit "not configured" state.
 *
 * The app is designed to boot and render seeded pages with zero env vars set,
 * so a new developer (or a preview deploy) sees a working golodex.com/hlt
 * before any credentials exist.
 */

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  siteUrl:
    opt("NEXT_PUBLIC_SITE_URL") ??
    (opt("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${opt("VERCEL_PROJECT_PRODUCTION_URL")}` : undefined) ??
    "https://golodex.com",

  supabaseUrl: opt("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: opt("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: opt("SUPABASE_SERVICE_ROLE_KEY"),

  /** Agency-level Private Integration Token, used for sub-account creation. */
  ghlAgencyToken: opt("GHL_AGENCY_TOKEN"),
  ghlCompanyId: opt("GHL_COMPANY_ID"),
  /** The shared "golodex.com" sub-account every unprovisioned lead lands in. */
  ghlDefaultLocationId: opt("GHL_DEFAULT_LOCATION_ID"),
  ghlDefaultLocationToken: opt("GHL_DEFAULT_LOCATION_TOKEN"),
  /** Snapshot loaded into every newly provisioned sub-account. */
  ghlSnapshotId: opt("GHL_SNAPSHOT_ID"),
} as const;

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasSupabaseAdmin = Boolean(env.supabaseUrl && env.supabaseServiceKey);
export const hasGhlAgency = Boolean(env.ghlAgencyToken && env.ghlCompanyId);
export const hasGhlLeadSync = Boolean(env.ghlDefaultLocationToken && env.ghlDefaultLocationId);
