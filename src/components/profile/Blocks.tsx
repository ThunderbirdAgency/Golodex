import type {
  AboutBlock,
  AgentBlock,
  Block,
  CalendarBlock,
  CtaBlock,
  EmbedBlock,
  GalleryBlock,
  HeadingBlock,
  LinkBlock,
  ListingsBlock,
  SocialsBlock,
  TestimonialBlock,
  TextBlock,
  VideoBlock,
  WorkBlock,
} from "@/lib/types";
import { resolveEmbed, safeHref } from "@/lib/embeds";
import { ChevronRight, LINK_ICONS, SOCIAL_ICONS, SOCIAL_LABELS } from "@/components/icons";
import { LeadForm } from "./LeadForm";
import { SmartImage } from "./Media";
import { AgentChat } from "./AgentChat";

/** Staggered entrance so the page assembles rather than snapping in. */
function rise(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, 10) * 55 + 90}ms` };
}

export function Blocks({
  blocks,
  slug,
  ownerName = "",
}: {
  blocks: Block[];
  slug: string;
  ownerName?: string;
}) {
  const visible = blocks.filter((b) => !b.hidden);
  return (
    <div className="mt-7 flex flex-col gap-3">
      {visible.map((block, i) => (
        <div key={block.id} className="gx-rise" style={rise(i)}>
          <BlockSwitch block={block} slug={slug} ownerName={ownerName} />
        </div>
      ))}
    </div>
  );
}

function BlockSwitch({
  block,
  slug,
  ownerName,
}: {
  block: Block;
  slug: string;
  ownerName: string;
}) {
  switch (block.type) {
    case "link":
      return <LinkRow block={block} />;
    case "cta":
      return <Cta block={block} />;
    case "socials":
      return <Socials block={block} />;
    case "video":
      return <Video block={block} />;
    case "calendar":
      return <Calendar block={block} />;
    case "leadform":
      return <LeadForm block={block} slug={slug} />;
    case "listings":
      return <Listings block={block} />;
    case "testimonial":
      return <Testimonials block={block} />;
    case "text":
      return <Text block={block} />;
    case "heading":
      return <Heading block={block} />;
    case "gallery":
      return <Gallery block={block} />;
    case "embed":
      return <Embed block={block} />;
    case "about":
      return <About block={block} />;
    case "work":
      return <Work block={block} />;
    case "agent":
      return <AgentChat block={block} slug={slug} ownerName={ownerName} />;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------- link */

function LinkRow({ block }: { block: LinkBlock }) {
  const Icon = block.icon ? LINK_ICONS[block.icon] : undefined;

  return (
    <a
      href={safeHref(block.url)}
      target={block.url.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`gx-card gx-link${block.featured ? " gx-link--featured" : ""}`}
      data-gx-block={block.id}
    >
      {block.thumbnail ? (
        <SmartImage src={block.thumbnail} className="gx-thumb" />
      ) : Icon ? (
        <span
          className="flex flex-none items-center justify-center"
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "calc(var(--gx-radius-button) * 0.6)",
            background: block.featured ? "rgba(255,255,255,0.16)" : "var(--gx-accent-soft)",
            color: block.featured ? "inherit" : "var(--gx-accent)",
          }}
        >
          <Icon size={20} />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        {/* Wrap rather than truncate: the label is the whole point of the row.
            The badge flows inline so it can never squeeze the label into a
            one-word-per-line column on a narrow screen. */}
        <span className="block text-[0.9375rem] leading-snug font-semibold text-pretty">
          {block.label}
          {block.badge ? (
            <span
              className="ml-1.5 inline-block translate-y-[-1px] rounded-full px-1.5 py-0.5 align-middle text-[0.625rem] font-semibold uppercase tracking-wide"
              style={{
                background: block.featured ? "rgba(255,255,255,0.22)" : "var(--gx-accent-soft)",
                color: block.featured ? "inherit" : "var(--gx-accent)",
              }}
            >
              {block.badge}
            </span>
          ) : null}
        </span>
        {block.subtitle ? (
          <span className="gx-link__sub mt-0.5 block text-[0.8125rem] leading-snug line-clamp-1">
            {block.subtitle}
          </span>
        ) : null}
      </span>

      <ChevronRight size={18} className="gx-link__chevron" />
    </a>
  );
}

function Cta({ block }: { block: CtaBlock }) {
  const secondary = block.style === "secondary";
  return (
    <a
      href={safeHref(block.url)}
      target={block.url.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="gx-button"
      style={
        secondary
          ? {
              background: "transparent",
              color: "var(--gx-text)",
              border: "1px solid color-mix(in srgb, var(--gx-text) 22%, transparent)",
            }
          : undefined
      }
      data-gx-block={block.id}
    >
      <span className="flex flex-col items-center leading-tight">
        <span>{block.label}</span>
        {block.subtitle ? (
          <span className="mt-0.5 text-[0.75rem] font-normal opacity-75">{block.subtitle}</span>
        ) : null}
      </span>
    </a>
  );
}

/* ----------------------------------------------------------------- socials */

function Socials({ block }: { block: SocialsBlock }) {
  if (!block.items.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
      {block.items.map((item) => {
        const Icon = SOCIAL_ICONS[item.platform];
        if (!Icon) return null;
        return (
          <a
            key={item.platform + item.url}
            href={safeHref(item.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="gx-icon-btn"
            aria-label={SOCIAL_LABELS[item.platform]}
            data-gx-block={block.id}
          >
            <Icon size={19} />
          </a>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- media */

function Video({ block }: { block: VideoBlock }) {
  const embed = resolveEmbed(block.url);

  return (
    <figure className="gx-card gx-card--block overflow-hidden">
      <div
        className="w-full"
        style={{ aspectRatio: embed.ratio ?? "16 / 9", maxHeight: embed.portrait ? "70vh" : undefined }}
      >
        {embed.kind === "video" ? (
          <video
            src={embed.src}
            poster={block.poster}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <iframe
            src={embed.src}
            title={block.title ?? "Video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
            style={{ border: 0 }}
          />
        )}
      </div>
      {block.title ? (
        <figcaption className="px-4 py-3 text-[0.875rem] font-medium">{block.title}</figcaption>
      ) : null}
    </figure>
  );
}

function Calendar({ block }: { block: CalendarBlock }) {
  return (
    <section className="gx-card gx-card--block overflow-hidden">
      {block.title ? (
        <h3 className="gx-display px-4 pt-4 pb-2 text-lg font-semibold">{block.title}</h3>
      ) : null}
      <iframe
        src={resolveEmbed(block.url).src}
        title={block.title ?? "Booking calendar"}
        loading="lazy"
        className="w-full"
        style={{ border: 0, height: block.height ?? 640, display: "block" }}
      />
    </section>
  );
}

function Embed({ block }: { block: EmbedBlock }) {
  return (
    <section className="gx-card gx-card--block overflow-hidden">
      {block.title ? (
        <h3 className="gx-display px-4 pt-4 pb-2 text-lg font-semibold">{block.title}</h3>
      ) : null}
      <iframe
        src={resolveEmbed(block.url).src}
        title={block.title ?? "Embedded content"}
        loading="lazy"
        className="w-full"
        style={{ border: 0, height: block.height ?? 520, display: "block" }}
      />
    </section>
  );
}

/* ---------------------------------------------------------------- listings */

function Listings({ block }: { block: ListingsBlock }) {
  if (!block.items.length) return null;
  const grid = block.layout === "grid";

  return (
    <section>
      {block.title ? (
        <h3 className="gx-display mb-2.5 px-0.5 text-lg font-semibold">{block.title}</h3>
      ) : null}
      <div className={grid ? "grid grid-cols-2 gap-3" : "gx-scroller"}>
        {block.items.map((listing) => {
          const inner = (
            <>
              <div className="relative" style={{ aspectRatio: "4 / 3" }}>
                <SmartImage
                  src={listing.image}
                  alt={listing.address ?? "Property"}
                  className="h-full w-full object-cover"
                />
                {listing.status ? (
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide backdrop-blur"
                    style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}
                  >
                    {listing.status}
                  </span>
                ) : null}
              </div>
              <div className="p-3">
                {listing.price ? (
                  <p className="gx-display text-base font-bold">{listing.price}</p>
                ) : null}
                {listing.address ? (
                  <p className="mt-0.5 truncate text-[0.8125rem]" style={{ color: "var(--gx-text-muted)" }}>
                    {listing.address}
                  </p>
                ) : null}
                {listing.beds || listing.baths || listing.sqft ? (
                  <p className="mt-1.5 text-[0.75rem]" style={{ color: "var(--gx-text-faint)" }}>
                    {[
                      listing.beds ? `${listing.beds} bd` : null,
                      listing.baths ? `${listing.baths} ba` : null,
                      listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </>
          );

          const className = "gx-card gx-card--block overflow-hidden block";
          const style = grid ? undefined : { width: "15rem" };

          return listing.url ? (
            <a
              key={listing.id}
              href={safeHref(listing.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              style={style}
              data-gx-block={block.id}
            >
              {inner}
            </a>
          ) : (
            <div key={listing.id} className={className} style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- prose */

function Testimonials({ block }: { block: TestimonialBlock }) {
  if (!block.items.length) return null;
  return (
    <div className={block.items.length > 1 ? "gx-scroller" : ""}>
      {block.items.map((t, i) => (
        <figure
          key={i}
          className="gx-card gx-card--block p-5"
          style={block.items.length > 1 ? { width: "18rem" } : undefined}
        >
          <blockquote className="text-[0.9375rem] leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption className="mt-3.5 flex items-center gap-2.5">
            {t.avatar ? (
              <SmartImage src={t.avatar} className="h-8 w-8 flex-none rounded-full object-cover" />
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-semibold">{t.author}</span>
              {t.role ? (
                <span className="block truncate text-[0.75rem]" style={{ color: "var(--gx-text-faint)" }}>
                  {t.role}
                </span>
              ) : null}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Text({ block }: { block: TextBlock }) {
  return (
    <p
      className="px-1 text-[0.9375rem] leading-relaxed whitespace-pre-line"
      style={{
        color: "var(--gx-text-muted)",
        textAlign: block.align ?? "center",
      }}
    >
      {block.content}
    </p>
  );
}

function Heading({ block }: { block: HeadingBlock }) {
  return (
    <h2 className="gx-display mt-3 px-0.5 text-lg font-semibold">{block.content}</h2>
  );
}

function Gallery({ block }: { block: GalleryBlock }) {
  if (!block.images.length) return null;
  return (
    <div className="gx-scroller">
      {block.images.map((img, i) => (
        <figure key={i} className="gx-card gx-card--block overflow-hidden" style={{ width: "13rem" }}>
          <SmartImage
            src={img.url}
            alt={img.caption ?? ""}
            className="w-full object-cover"
            style={{ aspectRatio: "1 / 1" }}
          />
          {img.caption ? (
            <figcaption className="px-3 py-2 text-[0.75rem]" style={{ color: "var(--gx-text-muted)" }}>
              {img.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- story */

/**
 * "Who I am / what I do / why it matters."
 *
 * Set in the display face at a readable measure — this is the block a visitor
 * actually reads, so it gets the typographic treatment of an essay rather than
 * the density of a link row.
 */
function About({ block }: { block: AboutBlock }) {
  const paragraphs = [block.who, block.what, block.why].filter(Boolean) as string[];

  return (
    <section className="gx-card gx-card--block overflow-hidden">
      {block.image ? (
        <SmartImage
          src={block.image}
          className="w-full object-cover"
          style={{ aspectRatio: "16 / 10" }}
        />
      ) : null}

      <div className="p-5">
        {block.title ? (
          <h3 className="gx-display text-[1.0625rem] font-semibold">{block.title}</h3>
        ) : null}

        <div className={block.title ? "mt-2.5 space-y-3" : "space-y-3"}>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-[0.9375rem] leading-relaxed whitespace-pre-line"
              style={{ color: i === 0 ? "var(--gx-text)" : "var(--gx-text-muted)" }}
            >
              {p}
            </p>
          ))}
        </div>

        {block.facts?.length ? (
          <dl
            className="mt-4 grid gap-3 border-t pt-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(block.facts.length, 3)}, minmax(0, 1fr))`,
              borderColor: "color-mix(in srgb, var(--gx-text) 12%, transparent)",
            }}
          >
            {block.facts.slice(0, 3).map((f) => (
              <div key={f.label}>
                <dt
                  className="text-[0.6875rem] font-medium uppercase tracking-wide"
                  style={{ color: "var(--gx-text-faint)" }}
                >
                  {f.label}
                </dt>
                <dd className="gx-display mt-0.5 text-[1.0625rem] font-bold">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

/** Examples of work — the "here's what I've actually done" proof. */
function Work({ block }: { block: WorkBlock }) {
  if (!block.items.length) return null;
  const grid = block.layout === "grid";

  return (
    <section>
      {block.title ? (
        <h3 className="gx-display mb-2.5 px-0.5 text-lg font-semibold">{block.title}</h3>
      ) : null}

      <div className={grid ? "grid grid-cols-2 gap-3" : "gx-scroller"}>
        {block.items.map((item) => {
          const inner = (
            <>
              {/* No image is a normal case here — a written example should not
                  reserve a big empty rectangle above its own text. */}
              {item.image ? (
                <SmartImage
                  src={item.image}
                  alt={item.title}
                  className="w-full object-cover"
                  style={{ aspectRatio: "4 / 3" }}
                />
              ) : null}
              <div className="p-3">
                {item.tag ? (
                  <p
                    className="text-[0.6875rem] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--gx-accent)" }}
                  >
                    {item.tag}
                  </p>
                ) : null}
                <p className="gx-display mt-0.5 text-[0.9375rem] font-semibold leading-snug">
                  {item.title}
                </p>
                {item.description ? (
                  <p
                    className="mt-1 text-[0.8125rem] leading-snug line-clamp-2"
                    style={{ color: "var(--gx-text-muted)" }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </div>
            </>
          );

          const className = "gx-card gx-card--block block overflow-hidden";
          const style = grid ? undefined : { width: "15rem" };

          return item.url ? (
            <a
              key={item.id}
              href={safeHref(item.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              style={style}
              data-gx-block={block.id}
            >
              {inner}
            </a>
          ) : (
            <div key={item.id} className={className} style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
