import type { MetadataRoute } from "next";
import { listPublishedSlugs } from "@/lib/repo";
import { env } from "@/lib/env";

// Every published page is a real, indexable landing page for its owner's name —
// which is a meaningful part of why an agent keeps theirs.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listPublishedSlugs();
  return [
    { url: env.siteUrl, changeFrequency: "weekly", priority: 1 },
    ...slugs.map((slug) => ({
      url: `${env.siteUrl}/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
