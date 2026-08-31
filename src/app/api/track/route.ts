import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfileBySlug, recordEvent } from "@/lib/repo";

export const runtime = "nodejs";

const TrackSchema = z.object({
  slug: z.string().min(1).max(64),
  kind: z.enum(["view", "click", "save_contact", "share"]),
  blockId: z.string().max(64).optional(),
  referrer: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = TrackSchema.safeParse(payload);
  // Analytics is best-effort: never surface an error to the page for it.
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const profile = await getProfileBySlug(parsed.data.slug);
  if (profile) {
    await recordEvent(profile.rowId ?? profile.id, parsed.data.kind, {
      blockId: parsed.data.blockId,
      referrer: parsed.data.referrer,
    }).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
