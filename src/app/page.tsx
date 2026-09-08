import type { Metadata } from "next";
import { findSeedProfile } from "@/data/seed";
import { PhonePreview } from "@/components/marketing/PhonePreview";
import { Check, MapPin, UserPlus } from "@/components/icons";

export const metadata: Metadata = {
  title: "Golodex — your digital business card",
  description:
    "One beautiful page that says who you are, what you do, and why it matters. Save-to-contacts, a QR code for anywhere, and an AI assistant that answers for you.",
};

const FEATURES = [
  {
    icon: UserPlus,
    title: "Land in their phone book",
    body:
      "One tap saves your photo, title, and number as a real contact. A link gets forgotten in a browser tab; a contact card stays.",
  },
  {
    icon: Sparkle,
    title: "An assistant that answers for you",
    body:
      "Visitors ask questions at midnight and get a real answer about you \u2014 drawn only from your page, and always honest that it's an assistant.",
  },
  {
    icon: QrIcon,
    title: "A QR code for anywhere",
    body:
      "Business cards, yard signs, name badges, a phone held across a table. Print it at any size and it still scans.",
  },
  {
    icon: MapPin,
    title: "Built to be gifted",
    body:
      "One API call creates a finished page. Hand out a thousand as closing gifts and each one still looks made for that person.",
  },
];

const COMPARISON = [
  { feature: "Save-to-contacts (.vcf)", golodex: true, linktree: false, stan: false },
  { feature: "QR code, print-ready", golodex: true, linktree: true, stan: false },
  { feature: "AI assistant that answers about you", golodex: true, linktree: false, stan: false },
  { feature: "A real \u201cwho I am\u201d section", golodex: true, linktree: false, stan: false },
  { feature: "Work examples & proof", golodex: true, linktree: false, stan: false },
  { feature: "Leads pushed into your CRM", golodex: true, linktree: false, stan: false },
  { feature: "Bulk-create pages via API", golodex: true, linktree: false, stan: false },
];

export default function HomePage() {
  const demo = findSeedProfile("demo");

  return (
    <main className="min-h-dvh bg-[#fbfaf8] text-[#14161a]">
      {/* ------------------------------------------------------------- nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-[1.0625rem] font-bold tracking-tight">Golodex</span>
        <div className="flex items-center gap-3">
          <a href="/hlt" className="text-sm font-medium text-[#5a6069] hover:text-[#14161a]">
            Live example
          </a>
          <a
            href="/pricing"
            className="rounded-full bg-[#14161a] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
          >
            Get your page
          </a>
        </div>
      </nav>

      {/* ----------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e0da] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a6069]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            The digital business card, done properly
          </span>

          <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-balance sm:text-[3.5rem]">
            Be found. Be understood.
          </h1>

          <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-[#5a6069]">
            Golodex is one beautiful page that says who you are, what you do, and
            why it matters — so the person looking you up can actually decide
            about you. Scan it, save it, share it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/pricing"
              className="rounded-full bg-[#14161a] px-6 py-3 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px"
            >
              Claim your golodex.com/name
            </a>
            <a
              href="/demo"
              className="rounded-full border border-[#dcd8d1] bg-white px-6 py-3 text-[0.9375rem] font-semibold transition-transform hover:-translate-y-px"
            >
              See a live page
            </a>
          </div>

          <p className="mt-5 text-sm text-[#8a9099]">
            Free to start · Your own vanity URL · Live in under two minutes
          </p>
        </div>

        {demo ? <PhonePreview profile={demo} /> : null}
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="border-y border-[#ece9e3] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-2xl text-[2rem] font-bold leading-tight tracking-[-0.02em] text-balance">
            A list of links tells people where to click. A Golodex tells them who you are.
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1efe9] text-[#14161a]">
                  <Icon size={21} />
                </div>
                <h3 className="mt-4 text-[1.0625rem] font-semibold">{title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#5a6069]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ comparison */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.02em]">
            How it compares
          </h2>
          <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-[#5a6069]">
            Linktree was built for musicians to route traffic. Stan Store was built
            for creators to sell courses. Golodex is for people whose business runs
            on being known and trusted — not on checkout.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-[#e3e0da]">
                  <th className="py-3 pr-4 font-medium text-[#8a9099]">Feature</th>
                  <th className="px-4 py-3 font-semibold">Golodex</th>
                  <th className="px-4 py-3 font-medium text-[#8a9099]">Linktree</th>
                  <th className="px-4 py-3 font-medium text-[#8a9099]">Stan Store</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-[#f0ede7]">
                    <td className="py-3.5 pr-4">{row.feature}</td>
                    <Cell on={row.golodex} highlight />
                    <Cell on={row.linktree} />
                    <Cell on={row.stan} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- for teams */}
      <section className="border-y border-[#ece9e3] bg-[#14161a] py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.02em] text-balance">
              Give a thousand of them away.
            </h2>
            <p className="mt-4 max-w-lg text-[1rem] leading-relaxed text-white/70">
              Golodex has a real API. Your CRM, your closing-gift workflow, or your
              onboarding automation can create a finished, branded page for a client
              in one call — and get the live URL back to print, text, or email.
            </p>
            <p className="mt-4 max-w-lg text-[1rem] leading-relaxed text-white/70">
              Every page carries your &ldquo;Made with Golodex&rdquo; mark, so each gift
              becomes a storefront for the next one.
            </p>
          </div>

          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 text-[0.8125rem] leading-relaxed text-white/85">
{`POST /api/v1/pages
Authorization: Bearer gx_live_…

{
  "displayName": "Dana Reyes",
  "headline":    "Realtor® · Phoenix, AZ",
  "phone":       "+1 602 555 0134",
  "calendarUrl": "https://…/book",
  "theme":       "ivory",
  "socials":     { "instagram": "https://…" }
}

→ 201  { "url": "https://golodex.com/danareyes" }`}
          </pre>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section id="claim" className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] text-balance">
            Claim your name before someone else does.
          </h2>
          <p className="mt-4 text-[1.0625rem] text-[#5a6069]">
            golodex.com/<span className="font-semibold text-[#14161a]">yourname</span>
          </p>
          <a
            href="/pricing"
            className="mt-8 inline-block rounded-full bg-[#14161a] px-7 py-3.5 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px"
          >
            Get started
          </a>
        </div>
      </section>

      <footer className="border-t border-[#ece9e3] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-[#8a9099] sm:flex-row">
          <span>© {new Date().getFullYear()} Golodex · Thunderbird Agency · Glendale, AZ</span>
          <span className="flex gap-4">
            <a href="/pricing" className="hover:text-[#14161a]">Pricing</a>
            <a href="/legal/terms" className="hover:text-[#14161a]">Terms</a>
            <a href="/legal/privacy" className="hover:text-[#14161a]">Privacy</a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Sparkle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  );
}

function QrIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17.5 20.5v.01M20.5 17.5v.01" />
    </svg>
  );
}

function Cell({ on, highlight }: { on: boolean; highlight?: boolean }) {
  return (
    <td className="px-4 py-3.5">
      {on ? (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            background: highlight ? "#14161a" : "#e8e5df",
            color: highlight ? "#fff" : "#5a6069",
          }}
        >
          <Check size={14} strokeWidth={2.6} />
        </span>
      ) : (
        <span className="text-[#c9c5bd]">—</span>
      )}
    </td>
  );
}
