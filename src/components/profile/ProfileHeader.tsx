import type { Profile } from "@/lib/types";
import { BadgeCheck } from "@/components/icons";
import { Avatar, SmartImage } from "./Media";

/**
 * The first 400px of the page — the part that decides whether a visitor
 * scrolls. Name, role, and one line of proof, nothing else competing.
 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const { displayName, headline, bio, avatar, cover, logo, verified } = profile;

  return (
    <header className="gx-rise">
      {cover ? (
        <div
          className="relative -mx-[1.125rem] h-36 overflow-hidden sm:h-44"
          style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          <SmartImage src={cover} className="h-full w-full object-cover" eager />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--gx-bg) 92%, transparent), transparent 62%)",
            }}
          />
        </div>
      ) : null}

      <div
        className={
          cover ? "-mt-12 flex flex-col items-center" : "flex flex-col items-center pt-12"
        }
      >
        {/* Always rendered: a page with no headshot gets a monogram, never a gap. */}
        <Avatar src={avatar} name={displayName} />

        <div className="mt-4 flex items-center justify-center gap-2">
          <h1
            className="gx-display text-center text-[1.75rem] leading-tight font-bold text-balance sm:text-[2rem]"
            style={{ color: "var(--gx-text)" }}
          >
            {displayName}
          </h1>
          {verified ? (
            <span title="Verified" className="flex-none" style={{ color: "var(--gx-accent)" }}>
              <BadgeCheck size={22} />
            </span>
          ) : null}
        </div>

        {headline ? (
          <p
            className="mt-1.5 text-center text-[0.9375rem] font-medium text-balance"
            style={{ color: "var(--gx-text-muted)" }}
          >
            {headline}
          </p>
        ) : null}

        {logo ? (
          <SmartImage
            src={logo}
            className="mt-4 h-7 w-auto opacity-80"
            style={{ maxWidth: 180, objectFit: "contain" }}
          />
        ) : null}

        {bio ? (
          <p
            className="mt-4 max-w-[30rem] text-center text-[0.9375rem] leading-relaxed text-balance"
            style={{ color: "var(--gx-text-muted)" }}
          >
            {bio}
          </p>
        ) : null}
      </div>
    </header>
  );
}
