import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfileBySlug, markLeadSynced, recordLead } from "@/lib/repo";
import { addContactNote, resolveLeadDestination, upsertContact } from "@/lib/ghl";

export const runtime = "nodejs";

const LeadSchema = z.object({
  slug: z.string().min(1).max(64),
  blockId: z.string().max(64).optional(),
  name: z.string().max(120).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().max(40)).max(20).optional(),
  /** Honeypot — a real visitor never sees this field. */
  company_website: z.string().optional(),
});

const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const input = parsed.data;

  // Silently accept honeypot hits so bots get no signal to adapt to.
  if (input.company_website) return NextResponse.json({ ok: true });

  const email = clean(input.email);
  const phone = clean(input.phone);
  if (!email && !phone) {
    return NextResponse.json({ error: "Add an email address or a phone number." }, { status: 400 });
  }

  const profile = await getProfileBySlug(input.slug);
  if (!profile || profile.status === "draft") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  // Store first. A GHL outage must never lose a customer's lead.
  const leadId = await recordLead({
    profileId: profile.rowId ?? profile.id,
    blockId: input.blockId,
    name: clean(input.name),
    email,
    phone,
    message: clean(input.message),
    tags: input.tags ?? [],
    source: `golodex/${profile.slug}`,
    referrer: req.headers.get("referer") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  // Then push to the CRM. Tagging by slug is what lets one shared sub-account
  // hold leads for thousands of gifted pages and still route them correctly.
  const destination = resolveLeadDestination(profile.ghlLocationId);
  if (destination) {
    try {
      const { contactId } = await upsertContact(
        {
          locationId: destination.locationId,
          name: clean(input.name),
          email,
          phone,
          tags: ["golodex", `page:${profile.slug}`, ...(input.tags ?? [])],
          source: `Golodex · ${profile.slug}`,
        },
        destination.token,
      );

      const message = clean(input.message);
      if (message) await addContactNote(contactId, message, destination.token).catch(() => {});
      if (leadId) await markLeadSynced(leadId, { contactId });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown CRM error";
      console.error("[leads] GHL sync failed", reason);
      if (leadId) await markLeadSynced(leadId, { error: reason });
      // The lead is safe in Postgres; the visitor should still see success.
    }
  }

  return NextResponse.json({ ok: true });
}
