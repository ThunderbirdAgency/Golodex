import { NextResponse } from "next/server";
import { slugIsTaken } from "@/lib/repo";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Is this name free?
 *
 * Public and unauthenticated by necessity — it runs while someone is typing.
 * It reveals only whether a slug is taken, which is already visible by loading
 * the page, and it is rate limited so it cannot be used to enumerate quickly.
 */
export async function GET(req: Request) {
  if (!rateLimit(`slugcheck:${clientIp(req)}`, 40, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const raw = new URL(req.url).searchParams.get("slug") ?? "";
  const check = validateSlug(normalizeSlug(raw));

  if (!check.ok) {
    return NextResponse.json({ available: false, slug: normalizeSlug(raw), reason: check.reason });
  }

  const taken = await slugIsTaken(check.slug);
  return NextResponse.json({
    available: !taken,
    slug: check.slug,
    reason: taken ? "That name is taken." : undefined,
  });
}
