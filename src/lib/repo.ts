import type { Profile } from "./types";
import { supabaseAdmin, supabasePublic } from "./supabase";
import { findSeedProfile, SEED_PROFILES } from "@/data/seed";

/**
 * Profile persistence.
 *
 * Reads fall back to the built-in seed pages when Supabase is unconfigured or
 * has no row for the slug, so the app always renders something rather than
 * 404ing during setup. Writes require Supabase and say so explicitly.
 */

export interface ProfileRecord extends Profile {
  /** Present only for database-backed rows. */
  rowId?: string;
  ghlLocationId?: string | null;
}

function rowToProfile(row: Record<string, unknown>): ProfileRecord {
  const doc = (row.doc ?? {}) as Profile;
  return {
    ...doc,
    id: String(row.id),
    rowId: String(row.id),
    slug: String(row.slug),
    status: (row.status as Profile["status"]) ?? doc.status ?? "draft",
    ghlLocationId: (row.ghl_location_id as string | null) ?? null,
  };
}

export async function getProfileBySlug(slug: string): Promise<ProfileRecord | null> {
  const client = supabaseAdmin() ?? supabasePublic();

  if (client) {
    const { data, error } = await client
      .from("profiles")
      .select("id, slug, status, doc, ghl_location_id")
      .ilike("slug", slug)
      .maybeSingle();

    // A transport/permission error should not silently degrade to seed data in
    // production, but an empty result legitimately falls through to the seeds.
    if (error && error.code !== "PGRST116") {
      console.error("[repo] getProfileBySlug failed", error.message);
    }
    if (data) return rowToProfile(data as Record<string, unknown>);
  }

  return findSeedProfile(slug);
}

export async function listPublishedSlugs(): Promise<string[]> {
  const client = supabaseAdmin() ?? supabasePublic();
  const seeded = SEED_PROFILES.filter((p) => p.status === "published").map((p) => p.slug);

  if (!client) return seeded;

  const { data, error } = await client
    .from("profiles")
    .select("slug")
    .eq("status", "published")
    .limit(5000);

  if (error) {
    console.error("[repo] listPublishedSlugs failed", error.message);
    return seeded;
  }
  return Array.from(new Set([...seeded, ...(data ?? []).map((r) => String(r.slug))]));
}

export async function slugIsTaken(slug: string): Promise<boolean> {
  if (findSeedProfile(slug)) return true;
  const client = supabaseAdmin();
  if (!client) return false;

  const { data } = await client.from("profiles").select("id").ilike("slug", slug).maybeSingle();
  return Boolean(data);
}

export interface CreateProfileInput {
  slug: string;
  doc: Profile;
  accountId?: string | null;
  status?: Profile["status"];
  claimToken?: string | null;
  ghlLocationId?: string | null;
}

export async function createProfile(input: CreateProfileInput): Promise<ProfileRecord> {
  const client = supabaseAdmin();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to create pages.",
    );
  }

  const { data, error } = await client
    .from("profiles")
    .insert({
      slug: input.slug,
      doc: input.doc,
      status: input.status ?? "published",
      account_id: input.accountId ?? null,
      claim_token: input.claimToken ?? null,
      ghl_location_id: input.ghlLocationId ?? null,
    })
    .select("id, slug, status, doc, ghl_location_id")
    .single();

  if (error) throw new Error(error.message);
  return rowToProfile(data as Record<string, unknown>);
}

export async function updateProfileDoc(
  slug: string,
  doc: Profile,
  status?: Profile["status"],
): Promise<ProfileRecord> {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured.");

  const patch: Record<string, unknown> = { doc };
  if (status) patch.status = status;

  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .ilike("slug", slug)
    .select("id, slug, status, doc, ghl_location_id")
    .single();

  if (error) throw new Error(error.message);
  return rowToProfile(data as Record<string, unknown>);
}

/* -------------------------------------------------------------------- leads */

export interface LeadInput {
  profileId: string;
  blockId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  tags?: string[];
  source?: string;
  referrer?: string;
  userAgent?: string;
}

/** Returns the stored lead id, or null when there is nowhere to store it. */
export async function recordLead(lead: LeadInput): Promise<string | null> {
  const client = supabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from("leads")
    .insert({
      profile_id: lead.profileId,
      block_id: lead.blockId ?? null,
      name: lead.name ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      message: lead.message ?? null,
      tags: lead.tags ?? [],
      source: lead.source ?? null,
      referrer: lead.referrer ?? null,
      user_agent: lead.userAgent ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[repo] recordLead failed", error.message);
    return null;
  }
  return String(data.id);
}

export async function markLeadSynced(
  leadId: string,
  result: { contactId?: string; error?: string },
): Promise<void> {
  const client = supabaseAdmin();
  if (!client) return;

  await client
    .from("leads")
    .update({
      sync_status: result.error ? "failed" : "synced",
      sync_error: result.error ?? null,
      ghl_contact_id: result.contactId ?? null,
    })
    .eq("id", leadId);
}

/* ------------------------------------------------------------------- events */

export async function recordEvent(
  profileId: string,
  kind: "view" | "click" | "save_contact" | "share",
  meta: { blockId?: string; referrer?: string } = {},
): Promise<void> {
  const client = supabaseAdmin();
  if (!client) return;

  const { error } = await client.from("events").insert({
    profile_id: profileId,
    kind,
    block_id: meta.blockId ?? null,
    referrer: meta.referrer ?? null,
  });
  if (error) console.error("[repo] recordEvent failed", error.message);
}
