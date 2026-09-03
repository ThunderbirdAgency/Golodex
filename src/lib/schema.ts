import { z } from "zod";

/** Runtime validation mirroring the `Profile` document in `types.ts`. */

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Expected a hex color like #1d4ed8");

export const ThemeSchema = z.object({
  preset: z.string().max(40).optional(),
  mode: z.enum(["light", "dark"]),
  surface: z.enum(["solid", "gradient", "mesh", "image"]),
  card: z.enum(["solid", "glass", "outline", "elevated"]),
  radius: z.enum(["sharp", "soft", "round", "pill"]),
  font: z.enum(["modern", "editorial", "warm", "technical", "classic"]),
  accent: hex,
  background: hex,
  backgroundAlt: hex.optional(),
  backgroundImage: z.string().url().optional(),
  backgroundOverlay: z.number().min(0).max(100).optional(),
});

export const SocialPlatformSchema = z.enum([
  "instagram", "facebook", "tiktok", "youtube", "linkedin",
  "x", "threads", "pinterest", "zillow", "whatsapp", "website",
]);

const base = {
  id: z.string().min(1).max(64),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
};

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("link"),
    label: z.string().min(1).max(120),
    url: z.string().min(1).max(2000),
    subtitle: z.string().max(160).optional(),
    thumbnail: z.string().url().optional(),
    icon: z.string().max(40).optional(),
    badge: z.string().max(24).optional(),
    featured: z.boolean().optional(),
  }),
  z.object({
    ...base,
    type: z.literal("cta"),
    label: z.string().min(1).max(120),
    url: z.string().min(1).max(2000),
    subtitle: z.string().max(160).optional(),
    style: z.enum(["primary", "secondary"]).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("socials"),
    items: z.array(z.object({ platform: SocialPlatformSchema, url: z.string().max(2000) })).max(12),
  }),
  z.object({
    ...base,
    type: z.literal("video"),
    url: z.string().max(2000),
    title: z.string().max(160).optional(),
    poster: z.string().url().optional(),
  }),
  z.object({
    ...base,
    type: z.literal("calendar"),
    url: z.string().max(2000),
    title: z.string().max(160).optional(),
    height: z.number().int().min(200).max(1400).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("leadform"),
    title: z.string().min(1).max(120),
    description: z.string().max(400).optional(),
    submitLabel: z.string().max(40).optional(),
    fields: z.array(z.enum(["name", "email", "phone", "message"])).max(4).optional(),
    successMessage: z.string().max(200).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("listings"),
    title: z.string().max(120).optional(),
    layout: z.enum(["carousel", "grid"]).optional(),
    items: z
      .array(
        z.object({
          id: z.string().max(64),
          image: z.string().url(),
          price: z.string().max(40).optional(),
          address: z.string().max(200).optional(),
          beds: z.number().int().min(0).max(100).optional(),
          baths: z.number().min(0).max(100).optional(),
          sqft: z.number().int().min(0).max(1_000_000).optional(),
          status: z.enum(["For Sale", "Pending", "Sold", "Coming Soon"]).optional(),
          url: z.string().max(2000).optional(),
        }),
      )
      .max(50),
  }),
  z.object({
    ...base,
    type: z.literal("testimonial"),
    items: z
      .array(
        z.object({
          quote: z.string().min(1).max(600),
          author: z.string().min(1).max(120),
          role: z.string().max(120).optional(),
          avatar: z.string().url().optional(),
        }),
      )
      .max(20),
  }),
  z.object({
    ...base,
    type: z.literal("text"),
    content: z.string().min(1).max(2000),
    align: z.enum(["left", "center"]).optional(),
  }),
  z.object({ ...base, type: z.literal("heading"), content: z.string().min(1).max(120) }),
  z.object({
    ...base,
    type: z.literal("gallery"),
    images: z.array(z.object({ url: z.string().url(), caption: z.string().max(160).optional() })).max(30),
  }),
  z.object({
    ...base,
    type: z.literal("embed"),
    url: z.string().max(2000),
    title: z.string().max(160).optional(),
    height: z.number().int().min(200).max(1400).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("about"),
    title: z.string().max(120).optional(),
    who: z.string().min(1).max(1200),
    what: z.string().max(1200).optional(),
    why: z.string().max(1200).optional(),
    image: z.string().url().optional(),
    facts: z
      .array(z.object({ label: z.string().max(40), value: z.string().max(40) }))
      .max(3)
      .optional(),
  }),
  z.object({
    ...base,
    type: z.literal("work"),
    title: z.string().max(120).optional(),
    layout: z.enum(["carousel", "grid"]).optional(),
    items: z
      .array(
        z.object({
          id: z.string().max(64),
          title: z.string().min(1).max(120),
          description: z.string().max(400).optional(),
          image: z.string().url().optional(),
          tag: z.string().max(40).optional(),
          url: z.string().max(2000).optional(),
        }),
      )
      .max(30),
  }),
  z.object({
    ...base,
    type: z.literal("agent"),
    title: z.string().max(120).optional(),
    greeting: z.string().max(400).optional(),
    suggestions: z.array(z.string().max(120)).max(4).optional(),
    // Private context the assistant may draw on. Capped: this is prompt
    // context, not a knowledge base.
    knowledge: z.string().max(4000).optional(),
    captureLeads: z.boolean().optional(),
  }),
]);

export const ContactCardSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).optional(),
  organization: z.string().max(120).optional(),
  title: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional(),
  website: z.string().max(2000).optional(),
  address: z.string().max(200).optional(),
  license: z.string().max(80).optional(),
});

export const ProfileDocSchema = z.object({
  displayName: z.string().min(1).max(80),
  headline: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
  avatar: z.string().url().optional(),
  cover: z.string().url().optional(),
  logo: z.string().url().optional(),
  verified: z.boolean().optional(),
  theme: ThemeSchema.optional(),
  blocks: z.array(BlockSchema).max(60).optional(),
  contact: ContactCardSchema.optional(),
  disclosure: z.string().max(600).optional(),
  seo: z
    .object({
      title: z.string().max(120).optional(),
      description: z.string().max(300).optional(),
      image: z.string().url().optional(),
    })
    .optional(),
});
