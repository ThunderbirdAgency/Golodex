import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { z } from "zod";
import { authorizePageEdit } from "@/lib/auth";
import { getProfileBySlug, updateProfileDoc } from "@/lib/repo";
import { ProfileDocSchema, ThemeSchema } from "@/lib/schema";
import { describeViolations, findLockViolations } from "@/lib/locks";
import type { Block } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Save endpoint for the builder.
 *
 * Authorization is per-account: the page's owner, or staff. The previous
 * shared-token gate is gone — it granted edit rights on every page to whoever
 * held one string, which was never going to survive a second customer.
 *
 * Fields the builder is not allowed to move are pinned from the stored row
 * rather than taken from the request: slug, status, account ownership, and the
 * GHL location. A save can change how a page looks and reads; it can never
 * change who owns it or where its leads go.
 */

const SaveSchema = z.object({
  doc: ProfileDocSchema.extend({
    // Accepted so the client can round-trip its own state, then ignored.
    slug: z.string().max(64).optional(),
    id: z.string().max(64).optional(),
    status: z.enum(["draft", "published", "claimable"]).optional(),
    theme: ThemeSchema,
  }),
});

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`builder-save:${clientIp(req)}`, 40, 60000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { slug } = await ctx.params;

  const auth = await authorizePageEdit(slug);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const existing = await getProfileBySlug(slug);
  if (!existing || !existing.rowId) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some fields need fixing.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  const incoming = parsed.data.doc;

  // Locked blocks: staff set them, owners cannot work around them.
  if (!auth.staff) {
    const violations = findLockViolations(
      existing.blocks as Block[],
      (incoming.blocks ?? []) as Block[],
    );
    if (violations.length) {
      return NextResponse.json(
        { error: describeViolations(violations), violations },
        { status: 403 },
      );
    }
  }

  const next = {
    ...existing,
    ...incoming,
    // Not the builder's to change.
    slug: existing.slug,
    status: existing.status,
  };
  delete (next as Record<string, unknown>).rowId;
  delete (next as Record<string, unknown>).ghlLocationId;

  try {
    // The database trigger snapshots the outgoing version, so this is
    // recoverable from the History panel.
    await updateProfileDoc(existing.slug, next);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save.";
    console.error("[builder] save failed", message);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
