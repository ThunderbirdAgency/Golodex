import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Only the canonical domain is indexable.
 *
 * Preview and staging hosts serve the same pages, including example profiles,
 * and an indexed `*.vercel.app` copy would compete with the real site and put
 * demo content in front of people searching for a real person.
 */
// Evaluated per request. As a static route this would bake in whatever env the
// build happened to see, which is exactly how a preview host ends up serving a
// permissive robots.txt.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The Host header is what the crawler actually asked for, so it is the
  // truthful signal — more reliable than build-time configuration.
  const host = (await headers()).get("host") ?? new URL(env.siteUrl).host;
  const isCanonical = /^(www\.)?golodex\.com$/.test(host);

  if (!isCanonical) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/claim/"] }],
    sitemap: `https://${host}/sitemap.xml`,
  };
}
