import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { authorizePageEdit } from "@/lib/auth";
import { getProfileBySlug } from "@/lib/repo";
import { Builder } from "@/components/builder/Builder";

export const metadata: Metadata = {
  title: "Edit your page",
  robots: { index: false, follow: false },
};

// The builder must always open on the stored document, never a cached copy.
export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const auth = await authorizePageEdit(slug);

  if (!auth.ok) {
    if (auth.status === 401) redirect(`/login?next=${encodeURIComponent(`/edit/${slug}`)}`);
    // 403 and 404 both render as not-found: someone poking at slugs should not
    // be able to tell which pages exist.
    notFound();
  }

  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  return (
    <Builder
      initial={profile}
      canSave
      isStaff={auth.staff}
      ownerEmail={auth.account.email}
    />
  );
}
