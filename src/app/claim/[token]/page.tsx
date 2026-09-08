import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { ClaimForm } from "./ClaimForm";

export const metadata: Metadata = {
  title: "Claim your page",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where a gifted page gets taken over by the person it was made for.
 *
 * This is the whole point of the giveaway: someone receives a finished page,
 * likes it, and turns it into an account they control. The token is single-use
 * and is consumed by the API route, not here.
 */
export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const admin = supabaseAdmin();
  if (!admin) notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("slug, claim_token, claimed_at, doc")
    .eq("claim_token", token)
    .maybeSingle();

  // An unknown or spent token is a 404: no hint about which tokens are real.
  if (!profile || profile.claimed_at) notFound();

  const doc = (profile.doc ?? {}) as { displayName?: string };

  return (
    <main className="flex min-h-dvh flex-col bg-[#fbfaf8] text-[#14161a]">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>
      </div>

      <div className="flex flex-1 items-start justify-center px-6 pb-20 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-[#e3e0da] bg-white p-8">
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
            A page was made for you
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight">
            golodex.com/{String(profile.slug)}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#5a6069]">
            {doc.displayName ? `It's built for ${doc.displayName}. ` : ""}
            Enter your email and it&apos;s yours — you&apos;ll be able to edit it, and
            every enquiry comes to you.
          </p>

          <a
            href={`/${String(profile.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-[0.875rem] font-semibold underline decoration-[#dcd8d1] underline-offset-4"
          >
            Have a look first
          </a>

          <div className="mt-6 border-t border-[#f0ede7] pt-6">
            <ClaimForm token={token} />
          </div>
        </div>
      </div>
    </main>
  );
}
