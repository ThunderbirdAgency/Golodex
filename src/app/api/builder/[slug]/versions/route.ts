import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizePageEdit } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfileBySlug, updateProfileDoc } from "@/lib/repo";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Version history — the "I broke my page" escape hatch.
 *
 * Every save snapshots the previous document (see the `profiles_snapshot`
 * trigger), so self-service stays low-stakes: the worst a client can do to
 * their own page is recoverable by them, without contacting us.
 */

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await authorizePageEdit(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ versions: [] });

  const { data, error } = await admin
    .from("page_versions")
    .select("id, created_at, source")
    .eq("profile_id", auth.profileId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[versions] list failed", error.message);
    return NextResponse.json({ error: "Could not load history." }, { status: 500 });
  }

  return NextResponse.json({ versions: data ?? [] });
}

const RestoreSchema = z.object({ versionId: z.string().uuid() });

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const auth = await authorizePageEdit(slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = RestoreSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid version." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  // Scope the lookup to this page so a version id from another page can't be
  // restored onto it.
  const { data: version } = await admin
    .from("page_versions")
    .select("doc")
    .eq("id", parsed.data.versionId)
    .eq("profile_id", auth.profileId)
    .maybeSingle();

  if (!version) return NextResponse.json({ error: "That version is gone." }, { status: 404 });

  const existing = await getProfileBySlug(slug);
  if (!existing) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  const restored = {
    ...(version.doc as Profile),
    slug: existing.slug,
    status: existing.status,
  };
  delete (restored as Record<string, unknown>).rowId;
  delete (restored as Record<string, unknown>).ghlLocationId;

  try {
    // Restoring is itself a save, so the pre-restore state is snapshotted too —
    // an accidental restore is undoable.
    await updateProfileDoc(existing.slug, restored);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[versions] restore failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not restore that version." }, { status: 500 });
  }
}
