import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { z } from "zod";
import { authenticate } from "@/lib/apikey";
import { createProfile, slugIsTaken } from "@/lib/repo";
import { buildProfile, resolveTheme, type QuickPageInput } from "@/lib/pagebuilder";
import { BlockSchema, ProfileDocSchema, ThemeSchema } from "@/lib/schema";
import { normalizeSlug, slugFromName, validateSlug } from "@/lib/slug";
import { createSubAccount, hasGhlAgency, shouldProvisionSubAccount, type Plan } from "@/lib/ghl";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/v1/pages — create a page.
 *
 * Built for the gifting workflow: one authenticated call in, one live URL back.
 * Supply `blocks` for full control, or omit them and let `buildProfile` compose
 * a page from the quick fields.
 */

const SocialsSchema = z
  .record(
    z.enum([
      "instagram", "facebook", "tiktok", "youtube", "linkedin",
      "x", "threads", "pinterest", "zillow", "whatsapp", "website",
    ]),
    z.string().max(2000),
  )
  .optional();

const CreateSchema = z.object({
  /** Omit to derive one from `displayName`. */
  slug: z.string().max(40).optional(),
  plan: z.enum(["free", "pro", "business"]).default("free"),
  status: z.enum(["draft", "published", "claimable"]).default("published"),

  /** Preset name ("ivory") or a full theme object. */
  theme: z.union([z.string().max(40), ThemeSchema.partial()]).optional(),
  blocks: z.array(BlockSchema).max(60).optional(),

  /** Everything needed to compose a page when `blocks` is omitted. */
  displayName: z.string().min(1).max(80),
  headline: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
  avatar: z.string().url().optional(),
  cover: z.string().url().optional(),
  logo: z.string().url().optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional(),
  website: z.string().max(2000).optional(),
  address: z.string().max(200).optional(),
  organization: z.string().max(120).optional(),
  title: z.string().max(120).optional(),
  license: z.string().max(80).optional(),
  calendarUrl: z.string().max(2000).optional(),
  primaryActionUrl: z.string().max(2000).optional(),
  primaryActionLabel: z.string().max(80).optional(),
  socials: SocialsSchema,
  leadForm: z.boolean().optional(),
  leadFormTitle: z.string().max(120).optional(),
  leadTags: z.array(z.string().max(40)).max(20).optional(),
  disclosure: z.string().max(600).optional(),

  /** Free-text note recorded on the account, e.g. "Gift — Q3 agent mailer". */
  giftedBy: z.string().max(120).optional(),
});

/** Try the preferred slug, then -2, -3 … so bulk gifting never hard-fails. */
async function allocateSlug(preferred: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? preferred : `${preferred}-${i + 1}`;
    const check = validateSlug(candidate);
    if (check.ok && !(await slugIsTaken(check.slug))) return check.slug;
  }
  // Extremely unlikely; a short random suffix guarantees termination.
  return `${preferred}-${randomBytes(3).toString("hex")}`;
}

export async function POST(req: Request) {
  if (!rateLimit(`v1-create:${clientIp(req)}`, 30, 60000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const auth = await authenticate(req, "pages:write");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // --- slug ---------------------------------------------------------------
  const requested = input.slug ? normalizeSlug(input.slug) : slugFromName(input.displayName);
  if (!requested) {
    return NextResponse.json(
      { error: "Could not derive a slug. Pass `slug` explicitly." },
      { status: 422 },
    );
  }
  const requestedCheck = validateSlug(requested);
  if (!requestedCheck.ok) {
    return NextResponse.json({ error: requestedCheck.reason }, { status: 422 });
  }
  // An explicit slug must be honored or refused — silently renaming a slug the
  // caller is about to print on a business card would be worse than an error.
  if (input.slug && (await slugIsTaken(requestedCheck.slug))) {
    return NextResponse.json({ error: `The slug "${requestedCheck.slug}" is taken.` }, { status: 409 });
  }
  const slug = input.slug ? requestedCheck.slug : await allocateSlug(requestedCheck.slug);

  // --- document -----------------------------------------------------------
  const doc = buildProfile(slug, input as QuickPageInput, input.theme, input.blocks);
  doc.status = input.status;
  doc.theme = resolveTheme(input.theme);

  const docCheck = ProfileDocSchema.safeParse(doc);
  if (!docCheck.success) {
    return NextResponse.json({ error: "Generated page failed validation." }, { status: 500 });
  }

  // --- optional GHL sub-account ------------------------------------------
  // Free and gifted pages deliberately share the Golodex sub-account; only
  // paid plans get their own. See `shouldProvisionSubAccount`.
  let ghlLocationId: string | null = null;
  let ghlNote: string | undefined;

  if (shouldProvisionSubAccount(input.plan as Plan)) {
    if (!hasGhlAgency) {
      ghlNote = "Sub-account not provisioned: agency credentials are not configured.";
    } else {
      try {
        const [firstName, ...restName] = input.displayName.trim().split(/\s+/);
        const result = await createSubAccount({
          name: input.organization ?? input.displayName,
          email: input.email,
          firstName,
          lastName: restName.join(" ") || undefined,
          phone: input.phone,
          website: input.website,
          snapshotId: env.ghlSnapshotId,
        });
        ghlLocationId = result.locationId;
      } catch (err) {
        // A CRM hiccup must not cost us the page — return it, flag the gap.
        ghlNote = `Sub-account provisioning failed: ${err instanceof Error ? err.message : "unknown error"}`;
        console.error("[api/v1/pages]", ghlNote);
      }
    }
  }

  // --- persist ------------------------------------------------------------
  const claimToken = input.status === "claimable" ? randomBytes(24).toString("base64url") : null;

  try {
    const record = await createProfile({
      slug,
      doc,
      status: input.status,
      claimToken,
      ghlLocationId,
    });

    return NextResponse.json(
      {
        ok: true,
        id: record.rowId,
        slug,
        url: `${env.siteUrl}/${slug}`,
        vcardUrl: `${env.siteUrl}/${slug}/vcard`,
        claimUrl: claimToken ? `${env.siteUrl}/claim/${claimToken}` : null,
        ghlLocationId,
        note: ghlNote,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the page.";
    const status = /not configured/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message, ghlLocationId, note: ghlNote }, { status });
  }
}
