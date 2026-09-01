import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/repo";
import { Builder } from "@/components/builder/Builder";

export const metadata: Metadata = {
  title: "Edit your page",
  robots: { index: false, follow: false },
};

// The builder always reflects the stored document, never a cached copy.
export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  // Built-in seed pages have no database row, so they open read-only.
  const canSave = Boolean(profile.rowId);

  return <Builder initial={profile} canSave={canSave} />;
}
