"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget analytics.
 *
 * One page view on mount, then a delegated click listener so every block does
 * not need its own handler. Uses `sendBeacon` where available so a click that
 * navigates away still reports.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const send = (payload: Record<string, unknown>) => {
      const body = JSON.stringify({ slug, ...payload });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
          return;
        }
      } catch {
        /* fall through to fetch */
      }
      void fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    send({ kind: "view", referrer: document.referrer || undefined });

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-gx-block], [data-gx-action]");
      if (!el) return;

      const action = el.dataset.gxAction;
      send({
        kind: action === "save-contact" ? "save_contact" : "click",
        blockId: el.dataset.gxBlock ?? action,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [slug]);

  return null;
}
