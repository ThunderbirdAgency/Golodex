import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/repo";
import { themeStyle } from "@/lib/themes";
import { env } from "@/lib/env";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Blocks } from "@/components/profile/Blocks";
import { ActionBar } from "@/components/profile/ActionBar";
import { ViewTracker } from "@/components/profile/ViewTracker";

type Params = { params: Promise<{ slug: string }> };

// Pages are edited rarely and read constantly. Cache at the edge and let the
// editor revalidate on save.
export const revalidate = 60;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Page not found" };

  const title = profile.seo?.title ?? `${profile.displayName}${profile.headline ? ` · ${profile.headline}` : ""}`;
  const description = profile.seo?.description ?? profile.bio ?? `Connect with ${profile.displayName}.`;
  const url = `${env.siteUrl}/${profile.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      images: profile.seo?.image ? [{ url: profile.seo.image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: Params) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);

  if (!profile || profile.status === "draft") notFound();

  return (
    <main className="gx-root" style={themeStyle(profile.theme)}>
      <ViewTracker slug={profile.slug} />
      <div className="gx-shell">
        <ProfileHeader profile={profile} />
        <Blocks blocks={profile.blocks} slug={profile.slug} ownerName={profile.displayName} />

        {profile.disclosure ? (
          <p
            className="mt-9 px-2 text-center text-[0.6875rem] leading-relaxed"
            style={{ color: "var(--gx-text-faint)" }}
          >
            {profile.disclosure}
          </p>
        ) : null}

        {profile.contact?.license ? (
          <p
            className="mt-2 text-center text-[0.6875rem] font-medium"
            style={{ color: "var(--gx-text-faint)" }}
          >
            {profile.contact.license}
          </p>
        ) : null}

        <footer className="mt-8 flex justify-center">
          <a
            href={env.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-3 py-1.5 text-[0.6875rem] font-medium tracking-wide transition-opacity hover:opacity-100"
            style={{
              color: "var(--gx-text-faint)",
              border: "1px solid color-mix(in srgb, var(--gx-text) 10%, transparent)",
              opacity: 0.75,
            }}
          >
            Made with Golodex
          </a>
        </footer>
      </div>

      <ActionBar slug={profile.slug} contact={profile.contact} />
    </main>
  );
}
