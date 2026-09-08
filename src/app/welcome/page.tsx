import type { Metadata } from "next";
import { stripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Welcome to Golodex",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * After checkout.
 *
 * Deliberately does no provisioning — the webhook owns that, because this page
 * can be reached by URL without paying. All it does is confirm and tell them to
 * check their email.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let email: string | null = null;
  let slug: string | null = null;

  const client = stripe();
  if (client && session_id) {
    try {
      const session = await client.checkout.sessions.retrieve(session_id);
      // Only trust a session that Stripe reports as actually paid.
      if (session.payment_status === "paid" || session.status === "complete") {
        email = session.customer_details?.email ?? null;
        slug = (session.metadata?.slug as string | undefined) ?? null;
      }
    } catch {
      /* An unknown session id just renders the generic message. */
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#fbfaf8] text-[#14161a]">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md rounded-2xl border border-[#e3e0da] bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#14161a] text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </div>

          <h1 className="mt-5 text-[1.5rem] font-bold tracking-tight">You&apos;re in.</h1>

          {slug ? (
            <p className="mt-3 text-[1rem] font-semibold">golodex.com/{slug}</p>
          ) : null}

          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#5a6069]">
            We&apos;ve emailed{" "}
            {email ? <span className="font-medium text-[#14161a]">{email}</span> : "you"} a
            sign-in link. No password — click it and your page is ready to edit.
          </p>

          <p className="mt-5 text-[0.8125rem] leading-relaxed text-[#8a9099]">
            It can take a minute to arrive. Check your spam folder if it doesn&apos;t.
          </p>

          <a
            href="/login"
            className="mt-6 inline-block rounded-full border border-[#dcd8d1] px-5 py-2.5 text-[0.875rem] font-semibold"
          >
            Go to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
