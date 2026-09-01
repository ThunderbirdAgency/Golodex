import type { Block, BlockType, SocialPlatform } from "./types";

/**
 * Editor metadata for every block type.
 *
 * The builder renders its forms from these descriptors rather than from fifteen
 * bespoke components, so adding a block type means adding one entry here and a
 * renderer — not touching the editor at all.
 */

export type FieldDef =
  | { key: string; type: "text"; label: string; placeholder?: string; hint?: string }
  | { key: string; type: "textarea"; label: string; placeholder?: string; rows?: number; hint?: string }
  | { key: string; type: "url"; label: string; placeholder?: string; hint?: string }
  | { key: string; type: "image"; label: string; hint?: string }
  | { key: string; type: "number"; label: string; min?: number; max?: number }
  | { key: string; type: "toggle"; label: string; hint?: string }
  | { key: string; type: "select"; label: string; options: { value: string; label: string }[] }
  | { key: string; type: "icon"; label: string }
  | { key: string; type: "chips"; label: string; placeholder?: string; hint?: string }
  | { key: string; type: "socials"; label: string }
  | {
      key: string;
      type: "list";
      label: string;
      addLabel: string;
      /** Which sub-field to show as the row's collapsed title. */
      titleKey: string;
      max: number;
      fields: FieldDef[];
    };

export interface BlockDef {
  type: BlockType;
  label: string;
  /** One line in the "add block" menu. */
  description: string;
  /** Grouping in the add menu. */
  group: "Identity" | "Links" | "Proof" | "Connect";
  fields: FieldDef[];
  /** A sensible starting instance, so a new block is never an empty shell. */
  create: (id: string) => Block;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram", "facebook", "tiktok", "youtube", "linkedin",
  "x", "threads", "pinterest", "zillow", "whatsapp", "website",
];

export const SOCIAL_PLATFORM_LIST = SOCIAL_PLATFORMS;

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  about: {
    type: "about",
    label: "About",
    description: "Who you are, what you do, why it matters",
    group: "Identity",
    fields: [
      { key: "title", type: "text", label: "Section heading", placeholder: "About me" },
      {
        key: "who",
        type: "textarea",
        label: "Who I am",
        rows: 3,
        placeholder: "I grew up here and I've been helping families buy in the Valley since 2013.",
        hint: "Write it the way you'd say it out loud.",
      },
      { key: "what", type: "textarea", label: "What I do", rows: 2 },
      {
        key: "why",
        type: "textarea",
        label: "Why it matters",
        rows: 2,
        hint: "The reason a stranger should care.",
      },
      { key: "image", type: "image", label: "Photo" },
      {
        key: "facts",
        type: "list",
        label: "Quick facts",
        addLabel: "Add a fact",
        titleKey: "label",
        max: 3,
        fields: [
          { key: "label", type: "text", label: "Label", placeholder: "Experience" },
          { key: "value", type: "text", label: "Value", placeholder: "12 yrs" },
        ],
      },
    ],
    create: (id) => ({ id, type: "about", title: "About me", who: "" }),
  },

  work: {
    type: "work",
    label: "My work",
    description: "Projects, closings, case studies — proof you've done it",
    group: "Proof",
    fields: [
      { key: "title", type: "text", label: "Section heading", placeholder: "Recent work" },
      {
        key: "layout",
        type: "select",
        label: "Layout",
        options: [
          { value: "carousel", label: "Swipeable row" },
          { value: "grid", label: "Grid" },
        ],
      },
      {
        key: "items",
        type: "list",
        label: "Examples",
        addLabel: "Add an example",
        titleKey: "title",
        max: 30,
        fields: [
          { key: "title", type: "text", label: "Title" },
          { key: "tag", type: "text", label: "Tag", placeholder: "2024 · Case study" },
          { key: "description", type: "textarea", label: "Description", rows: 2 },
          { key: "image", type: "image", label: "Image" },
          { key: "url", type: "url", label: "Link" },
        ],
      },
    ],
    create: (id) => ({ id, type: "work", title: "Recent work", layout: "carousel", items: [] }),
  },

  agent: {
    type: "agent",
    label: "AI assistant",
    description: "Answers visitors' questions about you, from your page",
    group: "Connect",
    fields: [
      { key: "title", type: "text", label: "Heading", placeholder: "Ask about me" },
      {
        key: "greeting",
        type: "textarea",
        label: "Opening line",
        rows: 2,
        hint: "Shown before anyone types.",
      },
      {
        key: "suggestions",
        type: "chips",
        label: "Starter questions",
        placeholder: "Type a question and press Enter",
      },
      {
        key: "knowledge",
        type: "textarea",
        label: "What else should it know?",
        rows: 5,
        hint: "Hours, service area, specialties, how you like to work. Visitors never see this text — the assistant just answers from it. It will not make anything up beyond what's here and on your page.",
      },
      {
        key: "captureLeads",
        type: "toggle",
        label: "Point interested visitors to your contact form",
      },
    ],
    create: (id) => ({
      id,
      type: "agent",
      title: "Ask about me",
      captureLeads: true,
      suggestions: [],
    }),
  },

  link: {
    type: "link",
    label: "Link",
    description: "A single tappable row",
    group: "Links",
    fields: [
      { key: "label", type: "text", label: "Label" },
      { key: "url", type: "url", label: "Link" },
      { key: "subtitle", type: "text", label: "Subtitle" },
      { key: "icon", type: "icon", label: "Icon" },
      { key: "thumbnail", type: "image", label: "Thumbnail" },
      { key: "badge", type: "text", label: "Badge", placeholder: "New" },
      { key: "featured", type: "toggle", label: "Highlight this link", hint: "Fills it with your accent color. Use it on one link at a time." },
    ],
    create: (id) => ({ id, type: "link", label: "New link", url: "" }),
  },

  cta: {
    type: "cta",
    label: "Button",
    description: "A full-width call to action",
    group: "Links",
    fields: [
      { key: "label", type: "text", label: "Label" },
      { key: "url", type: "url", label: "Link" },
      { key: "subtitle", type: "text", label: "Small print" },
      {
        key: "style",
        type: "select",
        label: "Style",
        options: [
          { value: "primary", label: "Solid" },
          { value: "secondary", label: "Outline" },
        ],
      },
    ],
    create: (id) => ({ id, type: "cta", label: "Get in touch", url: "", style: "primary" }),
  },

  socials: {
    type: "socials",
    label: "Social icons",
    description: "A row of profile links",
    group: "Identity",
    fields: [{ key: "items", type: "socials", label: "Profiles" }],
    create: (id) => ({ id, type: "socials", items: [] }),
  },

  video: {
    type: "video",
    label: "Video",
    description: "YouTube, Vimeo, Loom, TikTok, or a file",
    group: "Proof",
    fields: [
      { key: "url", type: "url", label: "Video link" },
      { key: "title", type: "text", label: "Caption" },
      { key: "poster", type: "image", label: "Cover image" },
    ],
    create: (id) => ({ id, type: "video", url: "" }),
  },

  calendar: {
    type: "calendar",
    label: "Booking calendar",
    description: "Let people book time without leaving the page",
    group: "Connect",
    fields: [
      { key: "title", type: "text", label: "Heading", placeholder: "Book a call" },
      { key: "url", type: "url", label: "Calendar link", hint: "GoHighLevel, Calendly or Cal.com." },
      { key: "height", type: "number", label: "Height (px)", min: 300, max: 1200 },
    ],
    create: (id) => ({ id, type: "calendar", title: "Book a call", url: "", height: 640 }),
  },

  leadform: {
    type: "leadform",
    label: "Contact form",
    description: "Every submission lands in your CRM",
    group: "Connect",
    fields: [
      { key: "title", type: "text", label: "Heading" },
      { key: "description", type: "textarea", label: "Description", rows: 2 },
      { key: "submitLabel", type: "text", label: "Button text" },
      { key: "successMessage", type: "text", label: "Thank-you message" },
      { key: "tags", type: "chips", label: "CRM tags", hint: "Added to the contact in your CRM." },
    ],
    create: (id) => ({
      id,
      type: "leadform",
      title: "Get in touch",
      submitLabel: "Send",
      fields: ["name", "email", "phone", "message"],
    }),
  },

  listings: {
    type: "listings",
    label: "Property listings",
    description: "Price, beds, baths, status",
    group: "Proof",
    fields: [
      { key: "title", type: "text", label: "Section heading" },
      {
        key: "layout",
        type: "select",
        label: "Layout",
        options: [
          { value: "carousel", label: "Swipeable row" },
          { value: "grid", label: "Grid" },
        ],
      },
      {
        key: "items",
        type: "list",
        label: "Listings",
        addLabel: "Add a listing",
        titleKey: "address",
        max: 50,
        fields: [
          { key: "address", type: "text", label: "Address" },
          { key: "price", type: "text", label: "Price", placeholder: "$749,000" },
          { key: "image", type: "image", label: "Photo" },
          {
            key: "status",
            type: "select",
            label: "Status",
            options: [
              { value: "For Sale", label: "For Sale" },
              { value: "Coming Soon", label: "Coming Soon" },
              { value: "Pending", label: "Pending" },
              { value: "Sold", label: "Sold" },
            ],
          },
          { key: "beds", type: "number", label: "Beds", min: 0, max: 50 },
          { key: "baths", type: "number", label: "Baths", min: 0, max: 50 },
          { key: "sqft", type: "number", label: "Sq ft", min: 0, max: 100000 },
          { key: "url", type: "url", label: "Listing link" },
        ],
      },
    ],
    create: (id) => ({ id, type: "listings", title: "Current listings", layout: "carousel", items: [] }),
  },

  testimonial: {
    type: "testimonial",
    label: "Testimonials",
    description: "What people say about working with you",
    group: "Proof",
    fields: [
      {
        key: "items",
        type: "list",
        label: "Quotes",
        addLabel: "Add a testimonial",
        titleKey: "author",
        max: 20,
        fields: [
          { key: "quote", type: "textarea", label: "Quote", rows: 3 },
          { key: "author", type: "text", label: "Name" },
          { key: "role", type: "text", label: "Context", placeholder: "Sold in Arcadia" },
          { key: "avatar", type: "image", label: "Photo" },
        ],
      },
    ],
    create: (id) => ({ id, type: "testimonial", items: [] }),
  },

  gallery: {
    type: "gallery",
    label: "Photo gallery",
    description: "A swipeable row of images",
    group: "Proof",
    fields: [
      {
        key: "images",
        type: "list",
        label: "Images",
        addLabel: "Add an image",
        titleKey: "caption",
        max: 30,
        fields: [
          { key: "url", type: "image", label: "Image" },
          { key: "caption", type: "text", label: "Caption" },
        ],
      },
    ],
    create: (id) => ({ id, type: "gallery", images: [] }),
  },

  text: {
    type: "text",
    label: "Text",
    description: "A paragraph",
    group: "Identity",
    fields: [
      { key: "content", type: "textarea", label: "Text", rows: 4 },
      {
        key: "align",
        type: "select",
        label: "Alignment",
        options: [
          { value: "center", label: "Centered" },
          { value: "left", label: "Left" },
        ],
      },
    ],
    create: (id) => ({ id, type: "text", content: "", align: "center" }),
  },

  heading: {
    type: "heading",
    label: "Section heading",
    description: "Breaks the page into sections",
    group: "Identity",
    fields: [{ key: "content", type: "text", label: "Heading" }],
    create: (id) => ({ id, type: "heading", content: "Section" }),
  },

  embed: {
    type: "embed",
    label: "Embed",
    description: "Any other page that allows embedding",
    group: "Proof",
    fields: [
      { key: "title", type: "text", label: "Heading" },
      { key: "url", type: "url", label: "Link" },
      { key: "height", type: "number", label: "Height (px)", min: 200, max: 1400 },
    ],
    create: (id) => ({ id, type: "embed", url: "", height: 520 }),
  },
};

/** Order shown in the "add block" menu. */
export const ADD_MENU_ORDER: BlockType[] = [
  "about", "socials", "link", "cta", "agent", "leadform", "calendar",
  "work", "video", "testimonial", "listings", "gallery", "heading", "text", "embed",
];

export const LINK_ICON_CHOICES = [
  "", "phone", "mail", "calendar", "contact", "map", "play", "external", "globe", "check",
];

let counter = 0;
/** Stable-enough ids for new blocks; the document is the source of truth. */
export function newBlockId(type: string): string {
  counter += 1;
  return `${type}-${Date.now().toString(36)}${counter.toString(36)}`;
}
