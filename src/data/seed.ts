import type { Profile } from "@/lib/types";
import { themeFromPreset } from "@/lib/themes";

/**
 * Built-in pages.
 *
 * These render with zero configuration so the app is demoable before Supabase
 * exists. Once a slug is present in the database, the database wins.
 *
 * NOTE: fields marked TODO carry placeholders because the real values were not
 * available when this was seeded. `license` in particular MUST be filled in
 * with the real NMLS number before this page is pointed at production — a
 * mortgage page showing a wrong or fake NMLS ID is a compliance problem.
 */

const hlt: Profile = {
  id: "seed-hlt",
  slug: "hlt",
  displayName: "Erik Miller",
  headline: "Home Loan Team · Glendale, AZ",
  bio: "Straight answers on mortgages, first-time buying, and refinancing. Ask me anything — no pressure, no jargon.",
  // TODO: add Erik's real headshot. Until then the page renders an "EM"
  // monogram — a stock photo of someone else on a named mortgage page would
  // misrepresent him.
  avatar: undefined,
  verified: true,
  status: "published",
  theme: {
    ...themeFromPreset("slate")!,
    accent: "#1d4ed8",
  },
  contact: {
    firstName: "Erik",
    lastName: "Miller",
    organization: "Home Loan Team",
    title: "Mortgage Advisor",
    email: "EMiller@erikmillerhlt.com",
    phone: "", // TODO: add the direct line — this powers the tap-to-call button
    website: "https://erikmiller.team",
    address: "Glendale, AZ",
    license: "NMLS #0000000", // TODO: real NMLS number required before launch
  },
  blocks: [
    {
      id: "socials",
      type: "socials",
      items: [
        { platform: "instagram", url: "https://instagram.com/erikmillerhlt" },
        { platform: "facebook", url: "https://facebook.com/erikmillerhlt" },
        { platform: "tiktok", url: "https://tiktok.com/@erikmillerhlt" },
        { platform: "youtube", url: "https://youtube.com/@erikmillerhlt" },
      ],
    },
    {
      id: "book",
      type: "link",
      label: "Book a 15-minute call",
      subtitle: "Pick a time that works for you",
      icon: "calendar",
      badge: "Start here",
      featured: true,
      url: "https://meetmequickly.com/erikmiller",
    },
    {
      id: "apply",
      type: "link",
      label: "Start your mortgage application",
      subtitle: "Secure application · Patriot Home Mortgage",
      icon: "external",
      url: "https://patriothomemortgage.com",
    },
    {
      id: "guide",
      type: "link",
      label: "Free Home Buyer's Guide",
      subtitle: "Everything to know before you make an offer",
      icon: "check",
      url: "https://erikmiller.team/home-buyers-guide",
    },
    {
      id: "about",
      type: "about",
      title: "Who I am",
      who: "I'm Erik. I've been doing mortgages in the West Valley long enough to know that most people don't want a lecture on rate sheets \u2014 they want a straight answer about what they can afford and what it'll cost them.",
      what: "I handle purchases, refinances, and first-time buyers across Arizona.",
      why: "A mortgage is the biggest number most people ever sign their name to. You should understand it before you sign, not after.",
      facts: [
        { label: "Based in", value: "Glendale, AZ" },
        { label: "Licensed in", value: "Arizona" },
      ],
    },
    {
      id: "assistant",
      type: "agent",
      title: "Ask me anything",
      greeting:
        "Hi \u2014 I'm Erik's assistant. Ask me about the loan process, what he handles, or how to get started.",
      suggestions: [
        "What's the first step to buying?",
        "Do you work with first-time buyers?",
        "What areas do you cover?",
      ],
      captureLeads: true,
    },
    {
      id: "leadform",
      type: "leadform",
      title: "Not ready to book?",
      description: "Send me your question and I'll get back to you personally.",
      submitLabel: "Send my question",
      fields: ["name", "email", "phone", "message"],
      successMessage: "Got it — thank you!",
      tags: ["golodex", "hlt", "web-inquiry"],
    },
    {
      id: "site",
      type: "link",
      label: "Visit my website",
      subtitle: "erikmiller.team",
      icon: "globe",
      url: "https://erikmiller.team",
    },
    {
      id: "nmls",
      type: "link",
      label: "Verify my license",
      subtitle: "NMLS Consumer Access",
      icon: "check",
      url: "https://www.nmlsconsumeraccess.org/",
    },
  ],
  disclosure:
    "Erik Miller · Home Loan Team. All loans subject to credit approval. Rates and terms subject to change without notice. Equal Housing Lender.",
  seo: {
    title: "Erik Miller · Home Loan Team",
    description:
      "Straight answers on mortgages, first-time buying, and refinancing. Book a call or send a question.",
  },
};

/**
 * A demo realtor page. Exercises every block type — listings, video,
 * testimonials — and is what the marketing site links to as a live example.
 */
const demo: Profile = {
  id: "seed-demo",
  slug: "demo",
  displayName: "Jordan Avery",
  headline: "Realtor® · Scottsdale, AZ",
  bio: "Helping people buy and sell across the Valley. 120+ families moved since 2019.",
  verified: true,
  status: "published",
  theme: themeFromPreset("ivory")!,
  contact: {
    firstName: "Jordan",
    lastName: "Avery",
    organization: "Avery Group",
    title: "Realtor®",
    email: "hello@example.com",
    phone: "+16025550142",
    website: "https://golodex.com/demo",
    address: "Scottsdale, AZ",
  },
  blocks: [
    {
      id: "socials",
      type: "socials",
      items: [
        { platform: "instagram", url: "https://instagram.com" },
        { platform: "tiktok", url: "https://tiktok.com" },
        { platform: "youtube", url: "https://youtube.com" },
        { platform: "zillow", url: "https://zillow.com" },
      ],
    },
    {
      id: "cta",
      type: "link",
      label: "What's my home worth?",
      subtitle: "Free instant valuation",
      icon: "map",
      featured: true,
      badge: "Popular",
      url: "https://example.com/valuation",
    },
    {
      id: "about",
      type: "about",
      title: "About me",
      who: "I've lived in the Valley my whole life and I've been selling here since 2019. Most of my clients come from someone I've already worked with.",
      what: "I represent buyers and sellers across Scottsdale, Arcadia, Tempe and Phoenix.",
      why: "Moving is stressful enough. My job is to make sure you always know what's happening next and never feel rushed into a decision.",
      facts: [
        { label: "Since", value: "2019" },
        { label: "Families moved", value: "120+" },
        { label: "Avg. days", value: "18" },
      ],
    },
    {
      id: "assistant",
      type: "agent",
      title: "Ask about Jordan",
      greeting:
        "Hi \u2014 I'm Jordan's assistant. Ask me about her listings, the areas she covers, or how she works.",
      suggestions: [
        "What areas does she cover?",
        "How does she work with buyers?",
        "What's currently for sale?",
      ],
      captureLeads: true,
    },
    {
      id: "work",
      type: "work",
      title: "Recent moves",
      layout: "carousel",
      items: [
        {
          id: "w1",
          title: "Arcadia bungalow, sold in 9 days",
          tag: "2025",
          description: "Listed at $690k, closed at $730k after a three-offer weekend.",
        },
        {
          id: "w2",
          title: "First-time buyers, Tempe",
          tag: "2025",
          description: "Found a 3-bed under budget in a market with almost no inventory.",
        },
        {
          id: "w3",
          title: "Relocation from Seattle",
          tag: "2024",
          description: "Toured 14 homes over one weekend and closed remotely in 22 days.",
        },
      ],
    },
    {
      id: "listings",
      type: "listings",
      title: "Current listings",
      layout: "carousel",
      items: [
        {
          id: "l1",
          image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=450&fit=crop",
          price: "$749,000",
          address: "1420 E Camelback Rd",
          beds: 4,
          baths: 3,
          sqft: 2840,
          status: "For Sale",
          url: "https://example.com/listing/1",
        },
        {
          id: "l2",
          image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=450&fit=crop",
          price: "$1,150,000",
          address: "8802 N Scottsdale Rd",
          beds: 5,
          baths: 4,
          sqft: 4100,
          status: "Coming Soon",
          url: "https://example.com/listing/2",
        },
        {
          id: "l3",
          image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=450&fit=crop",
          price: "$525,000",
          address: "312 W Osborn Rd",
          beds: 3,
          baths: 2,
          sqft: 1780,
          status: "Pending",
          url: "https://example.com/listing/3",
        },
      ],
    },
    {
      id: "testimonials",
      type: "testimonial",
      items: [
        {
          quote:
            "Jordan got us $40k over asking in nine days. Answered every text within minutes.",
          author: "Marcus & Dee",
          role: "Sold in Arcadia",
        },
        {
          quote: "First-time buyers and completely lost. She walked us through all of it.",
          author: "Priya N.",
          role: "Bought in Tempe",
        },
      ],
    },
    {
      id: "book",
      type: "link",
      label: "Book a buyer consult",
      subtitle: "30 minutes, no obligation",
      icon: "calendar",
      url: "https://example.com/book",
    },
    {
      id: "leadform",
      type: "leadform",
      title: "Thinking about moving?",
      description: "Tell me a little about what you're looking for.",
      submitLabel: "Send",
      fields: ["name", "phone", "email", "message"],
      tags: ["golodex", "demo"],
    },
  ],
  disclosure: "Avery Group · Licensed in Arizona. Equal Housing Opportunity.",
};

export const SEED_PROFILES: Profile[] = [hlt, demo];

export function findSeedProfile(slug: string): Profile | null {
  const target = slug.toLowerCase();
  return SEED_PROFILES.find((p) => p.slug.toLowerCase() === target) ?? null;
}
