"use client";

import { useState } from "react";
import type { ContactCard } from "@/lib/types";
import { Phone, Share, UserPlus, Check } from "@/components/icons";

/**
 * Floating bar pinned above the thumb.
 *
 * "Save contact" is the whole strategy: a downloaded .vcf puts the agent in the
 * visitor's phone book permanently, which no Linktree page does.
 */
export function ActionBar({ slug, contact }: { slug: string; contact?: ContactCard }) {
  const [shared, setShared] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : `https://golodex.com/${slug}`;
    const title = contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : slug;

    // Native sheet where available (this is a phone-first product); clipboard
    // is the desktop fallback.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* Clipboard blocked; nothing useful to do. */
    }
  }

  return (
    <div className="gx-actionbar">
      <a
        className="gx-button flex-1"
        href={`/${slug}/vcard`}
        style={{ paddingInline: "0.75rem" }}
        data-gx-action="save-contact"
      >
        <UserPlus size={18} />
        <span className="text-[0.875rem]">Save contact</span>
      </a>

      {contact?.phone ? (
        <a
          className="gx-icon-btn"
          href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
          aria-label="Call"
          data-gx-action="call"
        >
          <Phone size={18} />
        </a>
      ) : null}

      <button className="gx-icon-btn" onClick={onShare} aria-label="Share this page" type="button">
        {shared ? <Check size={18} /> : <Share size={18} />}
      </button>
    </div>
  );
}
