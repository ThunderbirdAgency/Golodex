/**
 * The Golodex page document.
 *
 * A whole page — theme, content, contact card — is one JSON document stored on
 * the `profiles` row. That is deliberate: gifting a page to a real estate agent
 * from an external system has to be a single API call that returns a live URL,
 * not a chatty sequence of block inserts.
 */

export type ThemeMode = "light" | "dark";

/** Page background treatment. */
export type SurfaceStyle = "solid" | "gradient" | "mesh" | "image";

/** How link/content cards sit on the surface. */
export type CardStyle = "solid" | "glass" | "outline" | "elevated";

export type RadiusScale = "sharp" | "soft" | "round" | "pill";

/** Font pairings, resolved to real families in `themes.ts`. */
export type FontPairing =
  | "modern"      // Inter / Inter
  | "editorial"   // Instrument Serif / Inter
  | "warm"        // Fraunces / DM Sans
  | "technical"   // Space Grotesk / Inter
  | "classic";    // Libre Baskerville / Source Sans 3

export interface Theme {
  /** Preset id this theme was derived from, for the editor's "reset" affordance. */
  preset?: string;
  mode: ThemeMode;
  surface: SurfaceStyle;
  card: CardStyle;
  radius: RadiusScale;
  font: FontPairing;
  /** Primary accent, hex. Drives buttons, focus rings, active states. */
  accent: string;
  /** Base page color, hex. For `gradient`/`mesh` this is the anchor color. */
  background: string;
  /** Second color for gradient/mesh surfaces. */
  backgroundAlt?: string;
  /** Background image URL when surface is `image`. */
  backgroundImage?: string;
  /** 0-100. Darkens a background image so text stays legible. */
  backgroundOverlay?: number;
}

/* ------------------------------------------------------------------ blocks */

export type BlockType =
  | "link"
  | "cta"
  | "socials"
  | "video"
  | "calendar"
  | "leadform"
  | "listings"
  | "testimonial"
  | "text"
  | "heading"
  | "gallery"
  | "embed"
  | "about"
  | "work"
  | "agent";

interface BlockBase {
  id: string;
  type: BlockType;
  /** Hidden blocks stay in the document but do not render. */
  hidden?: boolean;
  /**
   * Set by staff. The page owner can still reorder and hide a locked block, but
   * cannot edit its content or delete it — enforced server-side on save, not
   * just in the UI. This is what lets us hand someone a page they can safely
   * tinker with without wrecking the compliance footer or the booking link.
   */
  locked?: boolean;
}

export interface LinkBlock extends BlockBase {
  type: "link";
  label: string;
  url: string;
  /** Small line under the label. */
  subtitle?: string;
  /** Square thumbnail shown at the leading edge. */
  thumbnail?: string;
  /** Lucide-ish icon name, used when there is no thumbnail. */
  icon?: string;
  /** e.g. "New", "Popular" — renders as a pill on the trailing edge. */
  badge?: string;
  /** Draws extra attention: accent fill, slight scale on hover. */
  featured?: boolean;
}

export interface CtaBlock extends BlockBase {
  type: "cta";
  label: string;
  url: string;
  subtitle?: string;
  style?: "primary" | "secondary";
}

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "threads"
  | "pinterest"
  | "zillow"
  | "whatsapp"
  | "website";

export interface SocialsBlock extends BlockBase {
  type: "socials";
  items: { platform: SocialPlatform; url: string }[];
}

export interface VideoBlock extends BlockBase {
  type: "video";
  /** YouTube, Vimeo, or a direct mp4. Normalized to an embed at render time. */
  url: string;
  title?: string;
  /** Poster image for direct-file videos. */
  poster?: string;
}

export interface CalendarBlock extends BlockBase {
  type: "calendar";
  /** GHL / Calendly / Cal.com embed URL. */
  url: string;
  title?: string;
  height?: number;
}

export interface LeadFormBlock extends BlockBase {
  type: "leadform";
  title: string;
  description?: string;
  submitLabel?: string;
  /** Which fields to collect. `name` and one of email/phone are always kept. */
  fields?: ("name" | "email" | "phone" | "message")[];
  /** Message shown after a successful submit. */
  successMessage?: string;
  /** Tags applied to the resulting CRM contact. */
  tags?: string[];
}

export interface Listing {
  id: string;
  image: string;
  price?: string;
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  status?: "For Sale" | "Pending" | "Sold" | "Coming Soon";
  url?: string;
}

export interface ListingsBlock extends BlockBase {
  type: "listings";
  title?: string;
  items: Listing[];
  layout?: "carousel" | "grid";
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  items: { quote: string; author: string; role?: string; avatar?: string }[];
}

export interface TextBlock extends BlockBase {
  type: "text";
  content: string;
  align?: "left" | "center";
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  content: string;
}

export interface GalleryBlock extends BlockBase {
  type: "gallery";
  images: { url: string; caption?: string }[];
}

export interface EmbedBlock extends BlockBase {
  type: "embed";
  url: string;
  title?: string;
  height?: number;
}

/**
 * "This is who I am, this is what I do, this is why it matters."
 *
 * The centerpiece of a Golodex page. A visitor should be able to decide whether
 * they want to work with this person from this block alone — which is the whole
 * difference between a link list and a digital business card.
 */
export interface AboutBlock extends BlockBase {
  type: "about";
  /** Section label, e.g. "About me". */
  title?: string;
  /** Who I am — a short paragraph in the person's own voice. */
  who: string;
  /** What I do — the concrete service or role. */
  what?: string;
  /** Why it matters — the reason a stranger should care. */
  why?: string;
  /** Optional portrait shown alongside the copy. */
  image?: string;
  /** Short proof points: "12 years in the Valley", "300+ closings". */
  facts?: { label: string; value: string }[];
}

/** Examples of work: projects, closings, builds, case studies, press. */
export interface WorkBlock extends BlockBase {
  type: "work";
  title?: string;
  layout?: "carousel" | "grid";
  items: {
    id: string;
    title: string;
    description?: string;
    image?: string;
    /** e.g. "2024", "Case study", "Featured in AZ Republic". */
    tag?: string;
    url?: string;
  }[];
}

/**
 * An AI concierge that answers questions about the page owner.
 *
 * Grounded strictly in the page's own content and explicitly labelled as an
 * assistant, never as the person. A visitor who believes they are messaging the
 * actual agent and later learns otherwise is a trust failure on a page whose
 * entire job is trust.
 */
export interface AgentBlock extends BlockBase {
  type: "agent";
  /** Heading, e.g. "Ask about Jordan". */
  title?: string;
  /** Opening line the assistant shows before the visitor types. */
  greeting?: string;
  /** Tap-to-send starter questions. */
  suggestions?: string[];
  /**
   * Extra private context the assistant may use when answering — hours,
   * service area, specialties, things not written elsewhere on the page.
   */
  knowledge?: string;
  /** Offer the lead form once the visitor shows real intent. */
  captureLeads?: boolean;
}

export type Block =
  | LinkBlock
  | CtaBlock
  | SocialsBlock
  | VideoBlock
  | CalendarBlock
  | LeadFormBlock
  | ListingsBlock
  | TestimonialBlock
  | TextBlock
  | HeadingBlock
  | GalleryBlock
  | EmbedBlock
  | AboutBlock
  | WorkBlock
  | AgentBlock;

/* ----------------------------------------------------------------- profile */

/** Everything needed to build the .vcf a visitor saves to their phone. */
export interface ContactCard {
  firstName: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  /** Shown under the compliance line, e.g. "NMLS #123456". */
  license?: string;
}

export interface Profile {
  id: string;
  /** The vanity path: golodex.com/<slug>. */
  slug: string;
  displayName: string;
  /** One line under the name: "Mortgage Advisor · Glendale, AZ". */
  headline?: string;
  bio?: string;
  avatar?: string;
  /** Wide image behind the avatar. */
  cover?: string;
  /** Small logo shown beside the name — brokerage, team, lender. */
  logo?: string;
  verified?: boolean;
  /**
   * Marks a demonstration page. Renders a visible badge so an invented persona
   * is never mistaken for a real person — the honest label belongs in its own
   * element, not appended to the headline.
   */
  example?: boolean;
  theme: Theme;
  blocks: Block[];
  contact?: ContactCard;
  /** Fine print rendered in the footer — required for NMLS/brokerage pages. */
  disclosure?: string;
  seo?: { title?: string; description?: string; image?: string };
  status: "draft" | "published" | "claimable";
}
