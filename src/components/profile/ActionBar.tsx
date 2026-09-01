"use client";

import { useEffect, useState } from "react";
import type { ContactCard } from "@/lib/types";
import { Phone, Share, UserPlus, Check } from "@/components/icons";

/**
 * Floating bar pinned above the thumb.
 *
 * "Save contact" is the whole strategy: a downloaded .vcf puts the page owner in
 * the visitor's phone book permanently, which no link-in-bio page does. The
 * share sheet carries the QR, so the page works held up across a table as well
 * as tapped from a bio.
 */
export function ActionBar({ slug, contact }: { slug: string; contact?: ContactCard }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState(`https://golodex.com/${slug}`);

  useEffect(() => {
    setPageUrl(window.location.href.split("?")[0]);
  }, []);

  // Escape closes the sheet, and body scroll stays locked while it is open.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const title = contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : slug;

  async function onShare() {
    // Native sheet where available (this is a phone-first product); the QR
    // sheet is the fallback and the desktop experience.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: pageUrl });
        return;
      } catch {
        // Dismissed — fall through to our own sheet.
      }
    }
    setSheetOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked; the URL is on screen to copy by hand. */
    }
  }

  return (
    <>
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

        <button
          className="gx-icon-btn"
          onClick={onShare}
          aria-label="Share this page"
          type="button"
        >
          <Share size={18} />
        </button>

        <button
          className="gx-icon-btn"
          onClick={() => setSheetOpen(true)}
          aria-label="Show QR code"
          type="button"
        >
          <QrGlyph />
        </button>
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
          onClick={() => setSheetOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Share this page"
        >
          <div
            className="gx-card w-full max-w-sm p-6 text-center"
            style={{
              background: "var(--gx-bg)",
              borderRadius: "24px 24px 0 0",
              animation: "gx-rise 240ms cubic-bezier(0.16,1,0.3,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="gx-display text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-[0.8125rem]" style={{ color: "var(--gx-text-muted)" }}>
              Point a camera here
            </p>

            <div
              className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3"
              style={{ boxShadow: "0 8px 28px -12px rgba(0,0,0,0.4)" }}
            >
              {/* Served by /:slug/qr — error-correction H, so it still scans in print. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/${slug}/qr`}
                alt={`QR code linking to ${pageUrl}`}
                width={200}
                height={200}
                style={{ display: "block", width: 200, height: 200 }}
              />
            </div>

            <p
              className="mt-4 truncate text-[0.8125rem] font-medium"
              style={{ color: "var(--gx-text-muted)" }}
            >
              {pageUrl.replace(/^https?:\/\//, "")}
            </p>

            <div className="mt-4 flex gap-2">
              <button className="gx-button" type="button" onClick={copyLink}>
                {copied ? <Check size={17} /> : null}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-3 w-full py-2 text-[0.875rem] font-medium"
              style={{ color: "var(--gx-text-faint)" }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QrGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17.5 20.5v.01M20.5 17.5v.01" />
    </svg>
  );
}
