import type { Metadata } from "next";
import { hasStripe } from "@/lib/stripe";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One beautiful page that says who you are — free to start, $25/month for the full card and an AI assistant that answers for you.",
};

export const dynamic = "force-dynamic";

export default function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  return (
    <main className="min-h-dvh bg-[#fbfaf8] text-[#14161a]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>
        <a href="/login" className="text-[0.875rem] font-medium text-[#5a6069] hover:text-[#14161a]">
          Sign in
        </a>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-6">
        <header className="text-center">
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] text-balance sm:text-[2.75rem]">
            Claim your name.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[1.0625rem] leading-relaxed text-[#5a6069]">
            One page that says who you are, what you do, and why it matters —
            and puts you in their phone.
          </p>
        </header>

        {!hasStripe ? (
          <p className="mx-auto mt-8 max-w-lg rounded-xl bg-[#fdf6e6] px-4 py-3 text-center text-[0.875rem] leading-relaxed text-[#7a5c17]">
            Checkout isn&apos;t switched on for this deployment yet. The plans below
            are live, but the buy button needs Stripe keys — see HANDOFF.md.
          </p>
        ) : null}

        <Cancelled searchParams={searchParams} />

        <div className="mt-10">
          <PricingClient />
        </div>

        <footer className="mt-16 text-center text-[0.75rem] text-[#8a9099]">
          <a className="hover:text-[#14161a]" href="/legal/terms">Terms</a>
          <span className="mx-2">·</span>
          <a className="hover:text-[#14161a]" href="/legal/privacy">Privacy</a>
        </footer>
      </div>
    </main>
  );
}

async function Cancelled({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  if (!params.cancelled) return null;
  return (
    <p className="mx-auto mt-8 max-w-lg rounded-xl bg-white px-4 py-3 text-center text-[0.875rem] text-[#5a6069]">
      No charge was made. Your name is held for an hour if you want to come back.
    </p>
  );
}
