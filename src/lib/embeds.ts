import { safeFrameSrc } from "./security";

/** Normalize the URLs people actually paste into a block into embeddable ones. */

export type EmbedKind = "iframe" | "video" | "unknown";

export interface ResolvedEmbed {
  kind: EmbedKind;
  src: string;
  /** Intrinsic aspect ratio, when known. */
  ratio?: string;
  /** Vertical formats (Reels/TikTok) need a portrait frame. */
  portrait?: boolean;
}

function youTubeId(u: URL): string | null {
  if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1) || null;
  if (!u.hostname.includes("youtube.com")) return null;
  if (u.pathname === "/watch") return u.searchParams.get("v");
  const m = u.pathname.match(/^\/(embed|shorts|v|live)\/([\w-]+)/);
  return m ? m[2] : null;
}

export function resolveEmbed(rawUrl: string): ResolvedEmbed {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { kind: "unknown", src: rawUrl };
  }

  // Reject anything that is not http(s) before it can reach a frame or media
  // element. `new URL()` parses `javascript:` fine, and an iframe with a
  // `javascript:` src executes it — page content is user-authored, so this is
  // the boundary that stops one owner's block from scripting a visitor.
  const safe = safeFrameSrc(u.toString());
  if (!safe) return { kind: "unknown", src: "" };

  // Direct media files play natively — no third-party frame needed.
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) {
    return { kind: "video", src: safe, ratio: "16 / 9" };
  }

  const yt = youTubeId(u);
  if (yt) {
    const portrait = u.pathname.startsWith("/shorts/");
    const start = u.searchParams.get("t") ?? u.searchParams.get("start");
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    if (start) params.set("start", start.replace(/[^0-9]/g, "") || "0");
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${yt}?${params}`,
      ratio: portrait ? "9 / 16" : "16 / 9",
      portrait,
    };
  }

  if (u.hostname.includes("vimeo.com")) {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, ratio: "16 / 9" };
    }
  }

  if (u.hostname.includes("loom.com")) {
    const id = u.pathname.split("/").filter(Boolean).pop();
    if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}`, ratio: "16 / 9" };
  }

  if (u.hostname.includes("tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) {
      return {
        kind: "iframe",
        src: `https://www.tiktok.com/embed/v2/${m[1]}`,
        ratio: "9 / 16",
        portrait: true,
      };
    }
  }

  // GHL calendars, Calendly, Cal.com and anything else already embeddable.
  return { kind: "iframe", src: safe };
}

/** Only allow schemes that are safe as an href. */
export function safeHref(url: string): string {
  try {
    const u = new URL(url, "https://golodex.com");
    if (["http:", "https:", "mailto:", "tel:", "sms:"].includes(u.protocol)) return u.toString();
  } catch {
    /* fall through */
  }
  return "#";
}
