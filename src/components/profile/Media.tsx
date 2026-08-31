"use client";

import { useState } from "react";

/**
 * Images that fail gracefully.
 *
 * Pages are created in bulk from data we do not control — a gifted page may
 * carry a headshot URL that 404s, or none at all. A broken-image glyph on an
 * agent's page is worse than no image, so every remote image degrades to
 * something deliberate.
 */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 104,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--gx-radius-avatar)",
    border: "3px solid var(--gx-bg)",
    boxShadow: "0 8px 28px -10px rgba(0,0,0,0.45)",
    objectFit: "cover",
  };

  if (showFallback) {
    return (
      <div
        aria-label={name}
        role="img"
        style={{
          ...shared,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Derived from the page accent so the monogram reads as part of the
          // theme rather than a stock placeholder.
          background:
            "linear-gradient(140deg, color-mix(in srgb, var(--gx-accent) 82%, #fff), var(--gx-accent))",
          color: "var(--gx-accent-ink)",
          fontFamily: "var(--gx-font-display)",
          fontSize: size * 0.36,
          fontWeight: 600,
          letterSpacing: "0.01em",
        }}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="eager"
      fetchPriority="high"
      onError={() => setFailed(true)}
      style={shared}
    />
  );
}

/**
 * A remote image that collapses to a neutral tint rather than a broken glyph.
 * `className` and `style` are applied to both the image and the fallback so
 * layout does not shift when one replaces the other.
 */
export function SmartImage({
  src,
  alt = "",
  className,
  style,
  eager,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          ...style,
          background:
            "linear-gradient(135deg, var(--gx-accent-soft), color-mix(in srgb, var(--gx-text) 6%, transparent))",
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
