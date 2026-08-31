import type { CardStyle, FontPairing, RadiusScale, Theme } from "./types";
import { mix, readableOn, rgbaString } from "./color";

/* --------------------------------------------------------------- typography */

/** Google Font families per pairing. Loaded via <link> in the root layout. */
export const FONT_STACKS: Record<FontPairing, { display: string; body: string }> = {
  modern: {
    display: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    body: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  },
  editorial: {
    display: `"Instrument Serif", ui-serif, Georgia, "Times New Roman", serif`,
    body: `"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif`,
  },
  warm: {
    display: `"Fraunces", ui-serif, Georgia, serif`,
    body: `"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif`,
  },
  technical: {
    display: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`,
    body: `"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif`,
  },
  classic: {
    display: `"Libre Baskerville", ui-serif, Georgia, serif`,
    body: `"Source Sans 3", ui-sans-serif, system-ui, -apple-system, sans-serif`,
  },
};

/** One stylesheet covering every pairing — one request, cached across pages. */
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Inter:wght@400;500;600;700;800" +
  "&family=Instrument+Serif:ital@0;1" +
  "&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700" +
  "&family=DM+Sans:wght@400;500;700" +
  "&family=Space+Grotesk:wght@400;500;700" +
  "&family=Libre+Baskerville:wght@400;700" +
  "&family=Source+Sans+3:wght@400;600;700" +
  "&display=swap";

/* ------------------------------------------------------------------ metrics */

const RADII: Record<RadiusScale, { card: string; button: string; avatar: string }> = {
  sharp: { card: "2px", button: "2px", avatar: "8px" },
  soft: { card: "14px", button: "12px", avatar: "20px" },
  round: { card: "22px", button: "18px", avatar: "999px" },
  pill: { card: "999px", button: "999px", avatar: "999px" },
};

/* ------------------------------------------------------------------ presets */

export const THEME_PRESETS: Record<string, Theme & { label: string }> = {
  ivory: {
    label: "Ivory",
    preset: "ivory",
    mode: "light",
    surface: "solid",
    card: "outline",
    radius: "soft",
    font: "editorial",
    accent: "#111111",
    background: "#faf9f7",
  },
  slate: {
    label: "Slate",
    preset: "slate",
    mode: "light",
    surface: "gradient",
    card: "elevated",
    radius: "soft",
    font: "modern",
    accent: "#2563eb",
    background: "#f6f8fb",
    backgroundAlt: "#e8eef7",
  },
  linen: {
    label: "Linen",
    preset: "linen",
    mode: "light",
    surface: "solid",
    card: "elevated",
    radius: "round",
    font: "warm",
    accent: "#b4522d",
    background: "#f7f2ea",
  },
  midnight: {
    label: "Midnight",
    preset: "midnight",
    mode: "dark",
    surface: "mesh",
    card: "glass",
    radius: "round",
    font: "modern",
    accent: "#7c6cff",
    background: "#0b0b14",
    backgroundAlt: "#1a1140",
  },
  onyx: {
    label: "Onyx",
    preset: "onyx",
    mode: "dark",
    surface: "solid",
    card: "outline",
    radius: "sharp",
    font: "technical",
    accent: "#c6f24e",
    background: "#0a0a0a",
  },
  coastal: {
    label: "Coastal",
    preset: "coastal",
    mode: "light",
    surface: "gradient",
    card: "glass",
    radius: "round",
    font: "modern",
    accent: "#0e7490",
    background: "#eef7fa",
    backgroundAlt: "#cfe8f0",
  },
  aurora: {
    label: "Aurora",
    preset: "aurora",
    mode: "dark",
    surface: "mesh",
    card: "glass",
    radius: "pill",
    font: "modern",
    accent: "#22d3ee",
    background: "#08111b",
    backgroundAlt: "#12324a",
  },
  terracotta: {
    label: "Terracotta",
    preset: "terracotta",
    mode: "light",
    surface: "gradient",
    card: "solid",
    radius: "round",
    font: "warm",
    accent: "#c2410c",
    background: "#fdf6f0",
    backgroundAlt: "#f6dfcd",
  },
  forest: {
    label: "Forest",
    preset: "forest",
    mode: "dark",
    surface: "gradient",
    card: "elevated",
    radius: "soft",
    font: "editorial",
    accent: "#86c99a",
    background: "#0d1a14",
    backgroundAlt: "#13291f",
  },
  noirgold: {
    label: "Noir Gold",
    preset: "noirgold",
    mode: "dark",
    surface: "solid",
    card: "outline",
    radius: "soft",
    font: "classic",
    accent: "#c9a227",
    background: "#111111",
  },
};

/** A preset as a clean `Theme` — the `label` is UI-only and must not be stored. */
export function themeFromPreset(name: string): Theme | null {
  const preset = THEME_PRESETS[name];
  if (!preset) return null;
  const { label: _label, ...theme } = preset;
  return theme;
}

export const DEFAULT_THEME: Theme = themeFromPreset("slate")!;

/* ---------------------------------------------------------------- resolution */

/**
 * Turn a Theme into the CSS custom properties the profile renderer consumes.
 *
 * Only `accent` and `background` come from the user; every other color is
 * derived here so that an agent picking a brand color on their phone cannot
 * produce an unreadable page.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const dark = theme.mode === "dark";
  const bg = theme.background;
  const ink = dark ? "#ffffff" : "#0c0c0d";

  // Text: full-strength for headings, stepped down for supporting copy.
  const text = dark ? mix(bg, "#ffffff", 0.94) : mix(bg, "#000000", 0.9);
  const textMuted = dark ? mix(bg, "#ffffff", 0.62) : mix(bg, "#000000", 0.55);
  const textFaint = dark ? mix(bg, "#ffffff", 0.38) : mix(bg, "#000000", 0.35);

  // Card surface sits slightly off the page so blocks read as objects.
  const cardBg = dark ? mix(bg, "#ffffff", 0.07) : "#ffffff";
  const cardBorder = dark ? mix(bg, "#ffffff", 0.16) : mix(bg, "#000000", 0.1);

  const fonts = FONT_STACKS[theme.font];
  const radii = RADII[theme.radius];

  const vars: Record<string, string> = {
    "--gx-bg": bg,
    "--gx-bg-alt": theme.backgroundAlt ?? mix(bg, ink, 0.06),
    "--gx-text": text,
    "--gx-text-muted": textMuted,
    "--gx-text-faint": textFaint,
    "--gx-accent": theme.accent,
    "--gx-accent-ink": readableOn(theme.accent),
    "--gx-accent-soft": rgbaString(theme.accent, dark ? 0.18 : 0.1),
    "--gx-card-bg": cardStyleBg(theme.card, cardBg, dark),
    "--gx-card-border": cardStyleBorder(theme.card, cardBorder, theme.accent),
    "--gx-card-shadow": cardStyleShadow(theme.card, dark),
    "--gx-card-blur": theme.card === "glass" ? "saturate(160%) blur(14px)" : "none",
    "--gx-radius-card": radii.card,
    "--gx-radius-button": radii.button,
    "--gx-radius-avatar": radii.avatar,
    "--gx-font-display": fonts.display,
    "--gx-font-body": fonts.body,
    "--gx-surface-image": surfaceImage(theme),
    "--gx-overlay": String((theme.backgroundOverlay ?? 45) / 100),
  };

  return vars;
}

function cardStyleBg(style: CardStyle, cardBg: string, dark: boolean): string {
  switch (style) {
    case "glass":
      return dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.62)";
    case "outline":
      return "transparent";
    default:
      return cardBg;
  }
}

function cardStyleBorder(style: CardStyle, border: string, accent: string): string {
  switch (style) {
    case "outline":
      return `1px solid ${border}`;
    case "glass":
      return `1px solid rgba(255,255,255,0.22)`;
    case "elevated":
      return `1px solid ${rgbaString(accent, 0.06)}`;
    default:
      return "1px solid transparent";
  }
}

function cardStyleShadow(style: CardStyle, dark: boolean): string {
  if (style === "elevated") {
    return dark
      ? "0 1px 2px rgba(0,0,0,0.6), 0 8px 24px -6px rgba(0,0,0,0.5)"
      : "0 1px 2px rgba(16,24,40,0.05), 0 10px 28px -8px rgba(16,24,40,0.14)";
  }
  if (style === "glass") return "0 8px 32px -12px rgba(0,0,0,0.35)";
  return "none";
}

/** The `background-image` value for the page surface. */
function surfaceImage(theme: Theme): string {
  const { surface, background, accent } = theme;
  const alt = theme.backgroundAlt ?? mix(background, accent, 0.25);

  switch (surface) {
    case "gradient":
      return `linear-gradient(180deg, ${alt} 0%, ${background} 62%)`;
    case "mesh":
      // Three offset radial washes read as a soft aurora without an image asset.
      return [
        `radial-gradient(60% 45% at 12% 4%, ${rgbaString(accent, 0.34)} 0%, transparent 60%)`,
        `radial-gradient(55% 40% at 92% 12%, ${rgbaString(alt, 0.6)} 0%, transparent 62%)`,
        `radial-gradient(70% 50% at 50% 100%, ${rgbaString(alt, 0.4)} 0%, transparent 70%)`,
        `linear-gradient(180deg, ${background} 0%, ${background} 100%)`,
      ].join(", ");
    case "image":
      return theme.backgroundImage
        ? `linear-gradient(0deg, ${rgbaString(background, 0.9)}, ${rgbaString(background, 0.55)}), url("${theme.backgroundImage}")`
        : background;
    default:
      return "none";
  }
}

/** Inline `style` object for the profile root element. */
export function themeStyle(theme: Theme): React.CSSProperties {
  return themeToCssVars(theme) as unknown as React.CSSProperties;
}
