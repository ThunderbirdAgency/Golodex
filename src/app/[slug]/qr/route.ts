import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/lib/repo";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * The QR for a page.
 *
 * This is the bridge from the physical world — business cards, yard signs, name
 * badges, a phone held up across a table — so it has to survive being printed
 * small and scanned badly. Hence error-correction level H (~30% recoverable)
 * and a real quiet zone.
 *
 *   /:slug/qr            -> SVG, scales to any print size
 *   /:slug/qr?format=png -> PNG for tools that will not take SVG
 *   /:slug/qr?dark=%23111&light=%23fff&size=1024
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const profile = await getProfileBySlug(slug);

  if (!profile || profile.status === "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";

  // A QR only scans reliably at high contrast, so ignore a caller's colors
  // unless they are plain hex — no gradients, no light-on-light.
  const hex = (v: string | null, fallback: string) =>
    v && /^#?[0-9a-fA-F]{6}$/.test(v) ? (v.startsWith("#") ? v : `#${v}`) : fallback;

  const dark = hex(url.searchParams.get("dark"), "#000000");
  const light = url.searchParams.get("light") === "transparent"
    ? "#0000"
    : hex(url.searchParams.get("light"), "#ffffff");

  const size = Math.min(2048, Math.max(128, Number(url.searchParams.get("size")) || 1024));

  const target = `${env.siteUrl}/${profile.slug}`;
  const options = {
    errorCorrectionLevel: "H" as const,
    margin: 2,
    color: { dark, light },
  };

  try {
    if (format === "png") {
      const buffer = await QRCode.toBuffer(target, { ...options, type: "png", width: size });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "content-type": "image/png",
          "content-disposition": `inline; filename="${profile.slug}-qr.png"`,
          "cache-control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    const svg = await QRCode.toString(target, { ...options, type: "svg", width: size });
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[qr] generation failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not generate a QR code." }, { status: 500 });
  }
}
