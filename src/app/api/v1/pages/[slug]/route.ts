import { NextResponse } from "next/server";
import { authenticate } from "@/lib/apikey";
import { getProfileBySlug, updateProfileDoc } from "@/lib/repo";
import { ProfileDocSchema, ThemeSchema } from "@/lib/schema";
import { resolveTheme } from "@/lib/pagebuilder";
import { env } from "@/lib/env";
import { z } from "zod";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/v1/pages/:slug — read the stored document. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticate(req, "pages:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { slug } = await ctx.params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    slug: profile.slug,
    status: profile.status,
    url: `${env.siteUrl}/${profile.slug}`,
    ghlLocationId: profile.ghlLocationId ?? null,
    doc: profile,
  });
}

const PatchSchema = ProfileDocSchema.partial().extend({
  status: z.enum(["draft", "published", "claimable"]).optional(),
  theme: z.union([z.string().max(40), ThemeSchema.partial()]).optional(),
});

/**
 * PATCH /api/v1/pages/:slug — shallow-merge changes into the document.
 *
 * Shallow on purpose: sending `blocks` replaces the whole list, which is the
 * behaviour an automation wants (it holds the canonical copy), and it avoids
 * the ambiguity of merging arrays by index.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authenticate(req, "pages:write");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { slug } = await ctx.params;
  const existing = await getProfileBySlug(slug);
  if (!existing) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  if (!existing.rowId) {
    return NextResponse.json(
      { error: "This is a built-in seed page and cannot be edited through the API." },
      { status: 409 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  const { status, theme, ...rest } = parsed.data;
  const next = {
    ...existing,
    ...rest,
    theme: theme ? resolveTheme(theme) : existing.theme,
  };
  delete (next as Record<string, unknown>).rowId;
  delete (next as Record<string, unknown>).ghlLocationId;

  try {
    const record = await updateProfileDoc(slug, next, status);
    return NextResponse.json({
      ok: true,
      slug: record.slug,
      status: record.status,
      url: `${env.siteUrl}/${record.slug}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update the page.";
    return NextResponse.json({ error: message }, { status: /not configured/i.test(message) ? 503 : 500 });
  }
}
