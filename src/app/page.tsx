import type { Metadata } from "next";
import { findSeedProfile } from "@/data/seed";
import { PhonePreview } from "@/components/marketing/PhonePreview";
import { BadgeCheck, CalendarIcon, Check, MapPin, UserPlus } from "@/components/icons";

export const metadata: Metadata = {
  title: "Golodex — one link that puts you in their phone",
  description:
    "A beautiful bio link built for real estate, mortgage, and service pros. Save-to-contacts, live listings, and every lead straight into your CRM.",
};

const FEATURES = [
  {
    icon: UserPlus,
    title: "Land in their phone book",
    body:
      "One tap saves your photo, title, and number as a real contact. Linktree sends traffic away; Golodex makes you permanent.",
  },
  {
    icon: MapPin,
    title: "Listings that scroll",
    body:
      "Show active listings, price, beds and baths in a swipeable carousel — no other bio-link tool ships this out of the box.",
  },
  {
    icon: CalendarIcon,
    title: "Booking and forms inline",
    body:
      "Visitors book a call or ask a question without leaving the page. Every submission becomes a tagged CRM contact instantly.",
  },
  {
    icon: BadgeCheck,
    title: "Built to be gifted",
    body:
      "One API call creates a finished page. Hand out a thousand as closing gifts and each one still looks custom-made.",
  },
];

const COMPARISON = [
  { feature: "Save-to-contacts (.vcf)", golodex: true, linktree: false, stan: false },
  { feature: "Property listing carousel", golodex: true, linktree: false, stan: false },
  { feature: "Leads pushed into your CRM", golodex: true, linktree: false, stan: false },
  { feature: "Inline booking calendar", golodex: true, linktree: false, stan: true },
  { feature: "Bulk-create pages via API", golodex: true, linktree: false, stan: false },
  { feature: "Compliance / license footer", golodex: true, linktree: false, stan: false },
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
            href="#claim"
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
            Built for agents, lenders &amp; service pros
          </span>

          <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-balance sm:text-[3.5rem]">
            One link that puts you in their phone.
          </h1>

          <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-[#5a6069]">
            Golodex is the modern rolodex — a page beautiful enough to post on your
            Instagram, with save-to-contacts, live listings, and every lead routed
            straight into your CRM.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#claim"
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
            Everything a link-in-bio does, plus the things that actually win business.
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
            Linktree was built for musicians. Stan Store was built for course
            creators. Golodex is built for people who close deals in person.
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
            href="mailto:hello@golodex.com?subject=I%20want%20my%20Golodex%20page"
            className="mt-8 inline-block rounded-full bg-[#14161a] px-7 py-3.5 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px"
          >
            Get started
          </a>
        </div>
      </section>

      <footer className="border-t border-[#ece9e3] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-[#8a9099] sm:flex-row">
          <span>© {new Date().getFullYear()} Golodex · Thunderbird Agency · Glendale, AZ</span>
          <a href="/hlt" className="hover:text-[#14161a]">
            golodex.com/hlt
          </a>
        </div>
      </footer>
    </main>
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
