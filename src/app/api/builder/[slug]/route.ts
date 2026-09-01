import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getProfileBySlug, updateProfileDoc } from "@/lib/repo";
import { ProfileDocSchema, ThemeSchema } from "@/lib/schema";

export const runtime = "nodejs";

/**
 * Save endpoint for the builder.
 *
 * SECURITY: per-user authentication does not exist yet, so this is closed by
 * default. It writes only when `GOLODEX_EDITOR_TOKEN` is set AND the browser
 * presents a matching `gx_editor` cookie — a deliberate single-operator lock
 * for preview deploys.
 *
 * This must be replaced with real per-account auth before anyone but the
 * operator can reach the builder; as written, one token grants edit rights to
 * every page, which is correct for a single-tenant preview and wrong the moment
 * a second person signs up.
 */

const SaveSchema = z.object({
  doc: ProfileDocSchema.extend({
    slug: z.string().max(64).optional(),
    id: z.string().max(64).optional(),
    status: z.enum(["draft", "published", "claimable"]).optional(),
    theme: ThemeSchema,
  }),
});

function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const expected = process.env.GOLODEX_EDITOR_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Saving is switched off on this deployment. Set GOLODEX_EDITOR_TOKEN to enable the builder.",
      },
      { status: 503 },
    );
  }

  const presented = (await cookies()).get("gx_editor")?.value;
  if (!presented || !tokensMatch(presented, expected)) {
    return NextResponse.json({ error: "You're not signed in to edit this page." }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const existing = await getProfileBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }
  if (!existing.rowId) {
    return NextResponse.json(
      { error: "This is a built-in example page and can't be saved over." },
      { status: 409 },
    );
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

  // The slug and status are not the builder's to change.
  const next = {
    ...existing,
    ...parsed.data.doc,
    slug: existing.slug,
    status: existing.status,
  };
  delete (next as Record<string, unknown>).rowId;
  delete (next as Record<string, unknown>).ghlLocationId;

  try {
    await updateProfileDoc(existing.slug, next);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
