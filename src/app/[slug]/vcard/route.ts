import { NextResponse } from "next/server";
import { getProfileBySlug } from "@/lib/repo";
import { env } from "@/lib/env";
import type { ContactCard } from "@/lib/types";

/**
 * Serve the page owner as a .vcf.
 *
 * This is the feature Linktree does not have and the reason a gifted page keeps
 * paying off: once a visitor taps "Save contact", the agent is in their phone
 * book with a photo, a title, and a link back to this page.
 */

/** vCard 3.0 escaping: backslash, comma, semicolon, newline. */
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

/** Long vCard lines must be folded at 75 octets, continued with a leading space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

function buildVCard(contact: ContactCard, pageUrl: string, note?: string): string {
  const last = contact.lastName ?? "";
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(contact.firstName)};;;`,
    `FN:${esc([contact.firstName, last].filter(Boolean).join(" "))}`,
  ];

  if (contact.organization) lines.push(`ORG:${esc(contact.organization)}`);
  if (contact.title) lines.push(`TITLE:${esc(contact.title)}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL,VOICE:${esc(contact.phone)}`);
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${esc(contact.email)}`);
  if (contact.website) lines.push(`URL:${esc(contact.website)}`);
  // The Golodex page itself, so the contact card links back to the live page.
  lines.push(`URL;TYPE=Golodex:${esc(pageUrl)}`);
  if (contact.address) lines.push(`ADR;TYPE=WORK:;;${esc(contact.address)};;;;`);

  const notes = [note, contact.license].filter(Boolean).join(" · ");
  if (notes) lines.push(`NOTE:${esc(notes)}`);

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  return lines.map(fold).join("\r\n") + "\r\n";
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const profile = await getProfileBySlug(slug);

  if (!profile || profile.status === "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fall back to the display name so every published page yields a usable card.
  const contact: ContactCard = profile.contact ?? {
    firstName: profile.displayName.split(" ")[0] ?? profile.displayName,
    lastName: profile.displayName.split(" ").slice(1).join(" ") || undefined,
    title: profile.headline,
    website: `${env.siteUrl}/${profile.slug}`,
  };

  const vcf = buildVCard(contact, `${env.siteUrl}/${profile.slug}`, profile.headline);
  const filename = `${profile.slug}.vcf`;

  return new NextResponse(vcf, {
    headers: {
      // text/vcard is what iOS and Android both act on.
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=300",
    },
  });
}
