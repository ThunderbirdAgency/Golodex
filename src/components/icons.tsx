import type { SocialPlatform } from "@/lib/types";

/**
 * A single hand-built icon family.
 *
 * Deliberately not a brand-mark library: a consistent 24px geometric set reads
 * as designed, where mixed-weight official logos read as clip art. Shapes stay
 * close enough to each platform's mark to be recognized at a glance.
 */

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({
  size = 20,
  className,
  strokeWidth = 1.75,
  children,
  fill = "none",
}: IconProps & { children: React.ReactNode; fill?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const Phone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z" />
  </Svg>
);

export const Mail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M3 7.5l8.2 5.4a1.5 1.5 0 0 0 1.6 0L21 7.5" />
  </Svg>
);

export const UserPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3 20a6.5 6.5 0 0 1 13 0" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const MapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Svg>
);

export const BadgeCheck = (p: IconProps) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <path d="M12 1.8l2.3 2.1 3.1-.3.9 3 2.8 1.4-1 3 1 3-2.8 1.4-.9 3-3.1-.3L12 22.2l-2.3-2.1-3.1.3-.9-3-2.8-1.4 1-3-1-3L5.7 5.6l.9-3 3.1.3L12 1.8z" />
    <path
      d="M8.2 12.2l2.6 2.6 5-5"
      fill="none"
      stroke="var(--gx-bg, #fff)"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Play = (p: IconProps) => (
  <Svg {...p} strokeWidth={0} fill="currentColor">
    <path d="M8 5.5v13l11-6.5z" />
  </Svg>
);

export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-8.5 8.5" />
    <path d="M19 14v4.5A2.5 2.5 0 0 1 16.5 21h-11A2.5 2.5 0 0 1 3 18.5v-11A2.5 2.5 0 0 1 5.5 5H10" />
  </Svg>
);

export const Share = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v13M12 3L8 7M12 3l4 4" />
    <path d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" />
  </Svg>
);

/* ------------------------------------------------------------------ socials */

const Instagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5.4" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

const Facebook = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M14.8 8.4h-1.6c-.9 0-1.4.5-1.4 1.4v1.7h2.9l-.4 2.9h-2.5v5.6" />
    <path d="M9.4 11.5h2.4" />
  </Svg>
);

const YouTube = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.2" y="5.4" width="19.6" height="13.2" rx="4" />
    <path d="M10.4 9.6l4.8 2.9-4.8 2.9z" fill="currentColor" stroke="none" />
  </Svg>
);

const LinkedIn = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3.4" />
    <circle cx="7.6" cy="7.9" r="1.2" fill="currentColor" stroke="none" />
    <path d="M7.6 10.8v6.4M11.4 17.2v-6.4M11.4 13.4c0-1.5.9-2.6 2.4-2.6s2.6 1 2.6 2.9v3.5" />
  </Svg>
);

const TikTok = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.4 3.2v10.9a3.6 3.6 0 1 1-3.6-3.6c.3 0 .6 0 .9.1" />
    <path d="M14.4 3.2c.3 2.5 2 4.2 4.5 4.4" />
  </Svg>
);

const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />
  </Svg>
);

const Threads = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21c-5 0-8.2-3.3-8.2-9S7 3 12 3c3.6 0 6.2 1.6 7.3 4.3" />
    <path d="M9.4 14.2c0-1.5 1.5-2.4 3.3-2.4 2.6 0 4.1 1.4 4.1 3.3 0 2-1.4 3.3-3.1 3.3-1.6 0-2.6-1-2.9-2.6-.4-2.3.9-4.2 3.4-4.2 1.4 0 2.5.5 3.2 1.3" />
  </Svg>
);

const Pinterest = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M10.2 20.2l2-8" />
    <path d="M8.9 11.6c0-2.2 1.7-3.9 3.9-3.9 2 0 3.4 1.3 3.4 3.3 0 2.3-1.3 4-3.1 4-1 0-1.8-.8-1.5-1.8" />
  </Svg>
);

const WhatsApp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.2a9.2 9.2 0 1 0-8-4.6L2.8 21.2l4.7-1.2a9.2 9.2 0 0 0 4.5 1.2z" />
    <path d="M9 8.8l.9 2-1.1 1a6.5 6.5 0 0 0 3.4 3.4l1-1.1 2 .9v1.6c0 .6-.5 1.1-1.2 1a9 9 0 0 1-7.6-7.6c-.1-.7.4-1.2 1-1.2z" />
  </Svg>
);

const Zillow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3L2.8 9.6 4 11.3l8-5.7 8 5.7 1.2-1.7z" />
    <path d="M6.6 12.6h10.8L6.6 18.4v2.2h10.8v-2.6H11l6.4-3.6v-2.4H6.6z" />
  </Svg>
);

const Globe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M2.8 12h18.4" />
    <path d="M12 2.8c2.4 2.5 3.6 5.6 3.6 9.2s-1.2 6.7-3.6 9.2c-2.4-2.5-3.6-5.6-3.6-9.2S9.6 5.3 12 2.8z" />
  </Svg>
);

export const SOCIAL_ICONS: Record<SocialPlatform, (p: IconProps) => React.ReactElement> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTok,
  youtube: YouTube,
  linkedin: LinkedIn,
  x: XIcon,
  threads: Threads,
  pinterest: Pinterest,
  zillow: Zillow,
  whatsapp: WhatsApp,
  website: Globe,
};

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  threads: "Threads",
  pinterest: "Pinterest",
  zillow: "Zillow",
  whatsapp: "WhatsApp",
  website: "Website",
};

/** Named icons usable from a link block's `icon` field. */
export const LINK_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  phone: Phone,
  mail: Mail,
  calendar: CalendarIcon,
  contact: UserPlus,
  map: MapPin,
  play: Play,
  external: ExternalLink,
  globe: Globe,
  check: Check,
};
