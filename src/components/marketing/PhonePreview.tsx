"use client";

import { useState } from "react";
import { THEME_PRESETS, themeStyle } from "@/lib/themes";
import type { Profile } from "@/lib/types";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Blocks } from "@/components/profile/Blocks";

/**
 * The homepage's proof of the product.
 *
 * Renders a real profile through the real renderer inside a phone frame, and
 * lets a visitor flip themes live. Every preset has to look good here, which
 * keeps the theme system honest.
 */

const SHOWCASE: (keyof typeof THEME_PRESETS)[] = [
  "slate", "ivory", "midnight", "linen", "onyx", "coastal", "terracotta", "aurora", "forest", "noirgold",
];

export function PhonePreview({ profile }: { profile: Profile }) {
  const [preset, setPreset] = useState<string>("ivory");
  const theme = THEME_PRESETS[preset] ?? THEME_PRESETS.slate;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative w-[21.5rem] shrink-0 rounded-[2.75rem] p-3 shadow-2xl"
        style={{ background: "#111318", boxShadow: "0 40px 80px -30px rgba(0,0,0,0.55)" }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#111318]" />
        <div
          className="h-[38rem] overflow-y-auto overflow-x-hidden rounded-[2.1rem]"
          style={{ ...themeStyle(theme), backgroundColor: "var(--gx-bg)" }}
        >
          <div
            className="gx-root"
            style={{ backgroundAttachment: "scroll", minHeight: "100%" }}
          >
            <div className="gx-shell" style={{ paddingBottom: "2rem" }}>
              <ProfileHeader profile={{ ...profile, theme }} />
              <Blocks blocks={profile.blocks} slug={profile.slug} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
        {SHOWCASE.map((key) => {
          const t = THEME_PRESETS[key];
          const active = key === preset;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              aria-pressed={active}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderColor: active ? t.accent : "rgba(0,0,0,0.12)",
                background: active ? t.accent : "#fff",
                color: active ? "#fff" : "#333",
                boxShadow: active ? `0 4px 14px -4px ${t.accent}` : "none",
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ background: t.background }}
              />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
