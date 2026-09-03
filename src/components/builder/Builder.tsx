"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Block, BlockType, Profile, Theme } from "@/lib/types";
import { THEME_PRESETS, themeStyle } from "@/lib/themes";
import { ADD_MENU_ORDER, BLOCK_DEFS, newBlockId } from "@/lib/blockdefs";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Blocks } from "@/components/profile/Blocks";
import { Fields } from "./Fields";

/**
 * The Golodex page builder.
 *
 * One rule drives the layout: the preview is the real renderer, not a mockup.
 * Every edit is reflected by the same components that serve the live page, so
 * what someone builds here is exactly what a visitor gets.
 */

type Tab = "content" | "design" | "profile" | "share" | "history";
type Rec = Record<string, unknown>;

const TABS: { id: Tab; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "profile", label: "You" },
  { id: "share", label: "Share" },
  { id: "history", label: "History" },
];

export function Builder({
  initial,
  canSave,
  isStaff = false,
  ownerEmail,
}: {
  initial: Profile;
  canSave: boolean;
  /** Staff may edit and set locks; owners may not. */
  isStaff?: boolean;
  ownerEmail?: string;
}) {
  const [profile, setProfile] = useState<Profile>(initial);
  /** Undo stack. Bounded, because this is a safety net not a time machine. */
  const [history, setHistory] = useState<Profile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("content");
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => {
      setHistory((h) => [...h.slice(-49), prev]);
      return { ...prev, ...p };
    });
    setDirty(true);
    setSaved(null);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setProfile(h[h.length - 1]);
      setDirty(true);
      setSaved(null);
      return h.slice(0, -1);
    });
  }, []);

  const setBlocks = useCallback(
    (next: Block[]) => patch({ blocks: next }),
    [patch],
  );

  const onBlockChange = useCallback(
    (id: string, p: Rec) => {
      setProfile((prev) => {
        setHistory((h) => [...h.slice(-49), prev]);
        return {
          ...prev,
          blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)),
        };
      });
      setDirty(true);
      setSaved(null);
    },
    [],
  );

  function move(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= profile.blocks.length) return;
    const next = [...profile.blocks];
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
  }

  function addBlock(type: BlockType) {
    const block = BLOCK_DEFS[type].create(newBlockId(type));
    setBlocks([...profile.blocks, block]);
    setOpenBlock(block.id);
    setAdding(false);
    setTab("content");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/builder/${profile.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doc: profile }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not save.");
      setDirty(false);
      setHistory([]);
      setSaved("Saved");
      setTimeout(() => setSaved(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const style = useMemo(() => themeStyle(profile.theme), [profile.theme]);

  return (
    <div className="min-h-dvh bg-[#fbfaf8] text-[#14161a]">
      {/* ------------------------------------------------------------ top */}
      <header className="sticky top-0 z-30 border-b border-[#ece9e3] bg-[#fbfaf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[86rem] items-center gap-3 px-4 py-3">
          <a href="/" className="text-[0.9375rem] font-bold tracking-tight">Golodex</a>
          <span className="hidden text-[0.8125rem] text-[#8a9099] sm:inline">
            golodex.com/{profile.slug}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {error ? (
              <span className="text-[0.8125rem] font-medium text-[#c62a2a]">{error}</span>
            ) : saved ? (
              <span className="text-[0.8125rem] font-medium text-[#1a7f4b]">{saved}</span>
            ) : dirty ? (
              <span className="text-[0.8125rem] text-[#8a9099]">Unsaved changes</span>
            ) : null}

            <button
              type="button"
              onClick={undo}
              disabled={!history.length}
              title="Undo (nothing is saved until you press Save)"
              className="rounded-full border border-[#dcd8d1] bg-white px-3.5 py-2 text-[0.8125rem] font-semibold disabled:opacity-35"
            >
              Undo
            </button>
            <a
              href={`/${profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#dcd8d1] bg-white px-3.5 py-2 text-[0.8125rem] font-semibold"
            >
              View live
            </a>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="rounded-full bg-[#14161a] px-4 py-2 text-[0.8125rem] font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </header>

      {!canSave ? (
        <div className="border-b border-[#f0e4cc] bg-[#fdf6e6] px-4 py-2.5 text-center text-[0.8125rem] text-[#7a5c17]">
          Preview mode — this page is a built-in example, so changes here can be explored but not saved.
        </div>
      ) : null}

      <div className="mx-auto grid max-w-[86rem] gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* ------------------------------------------------------ editor */}
        <div className="order-2 lg:order-1">
          <nav className="flex gap-1 rounded-full border border-[#e3e0da] bg-white p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
                  tab === t.id ? "bg-[#14161a] text-white" : "text-[#5a6069] hover:bg-[#f4f2ee]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="mt-5">
            {tab === "content" ? (
              <ContentTab
                blocks={profile.blocks}
                openBlock={openBlock}
                setOpenBlock={setOpenBlock}
                onChange={onBlockChange}
                onMove={move}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                onRemove={(id) => {
                  setBlocks(profile.blocks.filter((b) => b.id !== id));
                  setOpenBlock(null);
                  setConfirmDelete(null);
                }}
                onToggleHidden={(id, hidden) => onBlockChange(id, { hidden })}
                onToggleLock={
                  isStaff ? (id, locked) => onBlockChange(id, { locked }) : undefined
                }
                isStaff={isStaff}
                adding={adding}
                setAdding={setAdding}
                onAdd={addBlock}
              />
            ) : null}

            {tab === "design" ? (
              <DesignTab theme={profile.theme} onChange={(theme) => patch({ theme })} />
            ) : null}

            {tab === "profile" ? <ProfileTab profile={profile} onChange={patch} /> : null}

            {tab === "share" ? <ShareTab slug={profile.slug} /> : null}

            {tab === "history" ? (
              <HistoryTab slug={profile.slug} canRestore={canSave} />
            ) : null}
          </div>
        </div>

        {/* ----------------------------------------------------- preview */}
        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <div
              className="relative mx-auto w-[21rem] max-w-full rounded-[2.6rem] p-3"
              style={{ background: "#111318", boxShadow: "0 34px 70px -28px rgba(0,0,0,0.5)" }}
            >
              <div className="absolute left-1/2 top-4 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#111318]" />
              <div
                className="h-[36rem] overflow-y-auto overflow-x-hidden rounded-[2rem]"
                style={{ ...style, backgroundColor: "var(--gx-bg)" }}
              >
                <div className="gx-root" style={{ backgroundAttachment: "scroll", minHeight: "100%" }}>
                  <div className="gx-shell" style={{ paddingBottom: "2rem" }}>
                    <ProfileHeader profile={profile} />
                    <Blocks
                      blocks={profile.blocks}
                      slug={profile.slug}
                      ownerName={profile.displayName}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[0.75rem] text-[#8a9099]">
              Live preview — this is the real page
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- content */

function ContentTab({
  blocks,
  openBlock,
  setOpenBlock,
  onChange,
  onMove,
  onRemove,
  onToggleHidden,
  onToggleLock,
  isStaff,
  confirmDelete,
  setConfirmDelete,
  adding,
  setAdding,
  onAdd,
}: {
  blocks: Block[];
  openBlock: string | null;
  setOpenBlock: (id: string | null) => void;
  onChange: (id: string, patch: Rec) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  /** Present only for staff. */
  onToggleLock?: (id: string, locked: boolean) => void;
  isStaff: boolean;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  adding: boolean;
  setAdding: (v: boolean) => void;
  onAdd: (type: BlockType) => void;
}) {
  const groups = useMemo(() => {
    const out = new Map<string, BlockType[]>();
    for (const type of ADD_MENU_ORDER) {
      const g = BLOCK_DEFS[type].group;
      out.set(g, [...(out.get(g) ?? []), type]);
    }
    return [...out.entries()];
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {blocks.map((block, i) => {
          const def = BLOCK_DEFS[block.type];
          const open = openBlock === block.id;
          // Locked blocks are read-only for owners and fully editable by staff.
          const readOnly = Boolean(block.locked) && !isStaff;

          return (
            <div
              key={block.id}
              className="rounded-xl border bg-white"
              style={{
                opacity: block.hidden ? 0.55 : 1,
                borderColor: block.locked ? "#dcd6c6" : "#e3e0da",
              }}
            >
              <div className="flex items-center gap-1 px-3 py-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setOpenBlock(open ? null : block.id)}
                  aria-expanded={open}
                >
                  <span className="flex items-center gap-1.5 text-[0.875rem] font-semibold">
                    {def.label}
                    {block.locked ? (
                      <span
                        title={
                          isStaff
                            ? "Locked — customers can't change this"
                            : "Set up by Golodex. You can move or hide it, but not change it."
                        }
                        className="text-[#9a8f6d]"
                        aria-label="Locked"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
                          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-[#8a9099]">
                    {summarize(block)}
                  </span>
                </button>

                {/* Reordering and hiding stay available even when locked —
                    they're reversible and visible. */}
                <SmallBtn label="Move up" onClick={() => onMove(i, -1)} disabled={i === 0}>↑</SmallBtn>
                <SmallBtn
                  label="Move down"
                  onClick={() => onMove(i, 1)}
                  disabled={i === blocks.length - 1}
                >
                  ↓
                </SmallBtn>
                <SmallBtn
                  label={block.hidden ? "Show" : "Hide"}
                  onClick={() => onToggleHidden(block.id, !block.hidden)}
                >
                  {block.hidden ? "◌" : "●"}
                </SmallBtn>

                {onToggleLock ? (
                  <SmallBtn
                    label={block.locked ? "Unlock for the customer" : "Lock so the customer can't change it"}
                    onClick={() => onToggleLock(block.id, !block.locked)}
                  >
                    {block.locked ? "🔒" : "🔓"}
                  </SmallBtn>
                ) : null}

                <SmallBtn
                  label="Delete"
                  onClick={() => setConfirmDelete(block.id)}
                  disabled={readOnly}
                >
                  ×
                </SmallBtn>
              </div>

              {confirmDelete === block.id ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-[#f6e6c8] bg-[#fdf8ec] px-3 py-2.5">
                  <span className="text-[0.8125rem] text-[#7a5c17]">
                    Delete this {def.label.toLowerCase()}?
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(block.id)}
                    className="rounded-full bg-[#14161a] px-3 py-1 text-[0.75rem] font-semibold text-white"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-full border border-[#dcd8d1] bg-white px-3 py-1 text-[0.75rem] font-semibold"
                  >
                    Keep it
                  </button>
                  <span className="text-[0.75rem] text-[#a08a4d]">Undo also works.</span>
                </div>
              ) : null}

              {open ? (
                <div className="border-t border-[#f0ede7] p-4">
                  {readOnly ? (
                    <p className="mb-3 rounded-lg bg-[#faf6ec] px-3 py-2 text-[0.8125rem] leading-snug text-[#7a5c17]">
                      Golodex set this up for you, so it can&apos;t be edited here — that&apos;s
                      what keeps your page working. You can still move it or hide it. Need a
                      change? Just ask us.
                    </p>
                  ) : null}
                  <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0 }}>
                    <Fields
                      defs={def.fields}
                      value={block as unknown as Rec}
                      onChange={(p) => onChange(block.id, p)}
                    />
                  </fieldset>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-3 rounded-xl border border-[#e3e0da] bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[0.875rem] font-semibold">Add a block</h3>
            <button
              type="button"
              className="text-[0.8125rem] text-[#8a9099]"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>

          {groups.map(([group, types]) => (
            <div key={group} className="mt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[#8a9099]">
                {group}
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onAdd(type)}
                    className="rounded-lg border border-[#e3e0da] px-3 py-2.5 text-left transition-colors hover:border-[#14161a]"
                  >
                    <span className="block text-[0.8125rem] font-semibold">
                      {BLOCK_DEFS[type].label}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] leading-snug text-[#7c828c]">
                      {BLOCK_DEFS[type].description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" className="bf-add mt-3 w-full" onClick={() => setAdding(true)}>
          + Add a block
        </button>
      )}
    </div>
  );
}

/** One line of the block's actual content, for the collapsed row. */
function summarize(block: Block): string {
  switch (block.type) {
    case "link":
    case "cta":
      return block.label || "Untitled";
    case "about":
      return block.who?.slice(0, 60) || "Tell people who you are";
    case "work":
      return `${block.items.length} example${block.items.length === 1 ? "" : "s"}`;
    case "agent":
      return block.title ?? "AI assistant";
    case "socials":
      return block.items.length ? block.items.map((i) => i.platform).join(", ") : "No profiles yet";
    case "listings":
      return `${block.items.length} listing${block.items.length === 1 ? "" : "s"}`;
    case "testimonial":
      return `${block.items.length} quote${block.items.length === 1 ? "" : "s"}`;
    case "gallery":
      return `${block.images.length} image${block.images.length === 1 ? "" : "s"}`;
    case "leadform":
      return block.title;
    case "calendar":
      return block.url || "Add your booking link";
    case "video":
      return block.url || "Add a video link";
    case "text":
      return block.content.slice(0, 60) || "Empty";
    case "heading":
      return block.content;
    case "embed":
      return block.url || "Add a link";
    default:
      return "";
  }
}

function SmallBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-[0.8125rem] text-[#5a6069] transition-colors hover:bg-[#f1efe9] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- design */

function DesignTab({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const set = (p: Partial<Theme>) => onChange({ ...theme, ...p });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-[0.875rem] font-semibold">Start from a look</h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => {
            const active = theme.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const { label: _label, ...rest } = preset;
                  onChange(rest as Theme);
                }}
                className="rounded-xl border p-2 text-left transition-transform hover:-translate-y-px"
                style={{ borderColor: active ? "#14161a" : "#e3e0da" }}
              >
                <span
                  className="block h-12 w-full rounded-lg"
                  style={{
                    background: preset.backgroundAlt
                      ? `linear-gradient(140deg, ${preset.backgroundAlt}, ${preset.background})`
                      : preset.background,
                    boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.06)`,
                  }}
                >
                  <span
                    className="ml-2 mt-2 inline-block h-4 w-4 rounded-full"
                    style={{ background: preset.accent }}
                  />
                </span>
                <span className="mt-1.5 block text-[0.75rem] font-semibold">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-[0.875rem] font-semibold">Make it yours</h3>
        <div className="mt-2.5 flex flex-col gap-3.5">
          <ColorRow
            label="Accent color"
            hint="Buttons, highlights, your monogram. Text contrast is adjusted automatically."
            value={theme.accent}
            onChange={(accent) => set({ accent, preset: undefined })}
          />
          <ColorRow
            label="Background"
            value={theme.background}
            onChange={(background) => set({ background, preset: undefined })}
          />

          <Choice
            label="Mood"
            value={theme.mode}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(mode) => set({ mode: mode as Theme["mode"], preset: undefined })}
          />
          <Choice
            label="Background style"
            value={theme.surface}
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
              { value: "mesh", label: "Glow" },
            ]}
            onChange={(surface) => set({ surface: surface as Theme["surface"], preset: undefined })}
          />
          <Choice
            label="Cards"
            value={theme.card}
            options={[
              { value: "elevated", label: "Raised" },
              { value: "solid", label: "Flat" },
              { value: "outline", label: "Outline" },
              { value: "glass", label: "Glass" },
            ]}
            onChange={(card) => set({ card: card as Theme["card"], preset: undefined })}
          />
          <Choice
            label="Corners"
            value={theme.radius}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "soft", label: "Soft" },
              { value: "round", label: "Round" },
              { value: "pill", label: "Pill" },
            ]}
            onChange={(radius) => set({ radius: radius as Theme["radius"], preset: undefined })}
          />
          <Choice
            label="Type"
            value={theme.font}
            options={[
              { value: "modern", label: "Modern" },
              { value: "editorial", label: "Editorial" },
              { value: "warm", label: "Warm" },
              { value: "technical", label: "Technical" },
              { value: "classic", label: "Classic" },
            ]}
            onChange={(font) => set({ font: font as Theme["font"], preset: undefined })}
          />
        </div>
      </section>
    </div>
  );
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-12 flex-none cursor-pointer rounded-md border border-[#e3e0da] bg-white p-1"
        />
        <input
          className="bf-input"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
        />
      </div>
      {hint ? <span className="mt-1 block text-[0.75rem] text-[#7c828c]">{hint}</span> : null}
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">{label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${
              value === o.value
                ? "border-[#14161a] bg-[#14161a] text-white"
                : "border-[#e3e0da] bg-white text-[#5a6069] hover:border-[#c9c5bd]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- profile */

function ProfileTab({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Partial<Profile>) => void;
}) {
  const contact = profile.contact ?? { firstName: profile.displayName.split(" ")[0] ?? "" };
  const setContact = (p: Rec) => onChange({ contact: { ...contact, ...p } });

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-[#e3e0da] bg-white p-4">
        <h3 className="text-[0.875rem] font-semibold">The top of your page</h3>
        <div className="mt-3">
          <Fields
            defs={[
              { key: "displayName", type: "text", label: "Name" },
              {
                key: "headline",
                type: "text",
                label: "One-liner",
                placeholder: "Realtor® · Scottsdale, AZ",
              },
              { key: "bio", type: "textarea", label: "Short intro", rows: 3 },
              { key: "avatar", type: "image", label: "Photo", hint: "Leave blank for a monogram." },
              { key: "cover", type: "image", label: "Cover image" },
              { key: "logo", type: "image", label: "Logo" },
              { key: "verified", type: "toggle", label: "Show the verified check" },
            ]}
            value={profile as unknown as Rec}
            onChange={(p) => onChange(p as Partial<Profile>)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-[#e3e0da] bg-white p-4">
        <h3 className="text-[0.875rem] font-semibold">Your contact card</h3>
        <p className="mt-1 text-[0.75rem] text-[#7c828c]">
          This is what saves to someone&apos;s phone when they tap “Save contact”.
        </p>
        <div className="mt-3">
          <Fields
            defs={[
              { key: "firstName", type: "text", label: "First name" },
              { key: "lastName", type: "text", label: "Last name" },
              { key: "title", type: "text", label: "Job title" },
              { key: "organization", type: "text", label: "Company" },
              { key: "phone", type: "text", label: "Phone", hint: "Enables the tap-to-call button." },
              { key: "email", type: "text", label: "Email" },
              { key: "website", type: "url", label: "Website" },
              { key: "address", type: "text", label: "Location" },
              { key: "license", type: "text", label: "License number", hint: "Shown in the footer." },
            ]}
            value={contact as unknown as Rec}
            onChange={setContact}
          />
        </div>
      </section>

      <section className="rounded-xl border border-[#e3e0da] bg-white p-4">
        <h3 className="text-[0.875rem] font-semibold">Fine print</h3>
        <div className="mt-3">
          <Fields
            defs={[{ key: "disclosure", type: "textarea", label: "Footer disclosure", rows: 3 }]}
            value={profile as unknown as Rec}
            onChange={(p) => onChange(p as Partial<Profile>)}
          />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ share */

function ShareTab({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://golodex.com/${slug}`;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[#e3e0da] bg-white p-5 text-center">
        <h3 className="text-[0.875rem] font-semibold">Your QR code</h3>
        <p className="mt-1 text-[0.75rem] text-[#7c828c]">
          Put it on a business card, a yard sign, or a name badge.
        </p>
        <div className="mx-auto mt-4 w-fit rounded-2xl border border-[#ece9e3] bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/${slug}/qr`}
            alt={`QR code linking to ${url}`}
            width={190}
            height={190}
            style={{ display: "block", width: 190, height: 190 }}
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a
            href={`/${slug}/qr?format=png&size=2048`}
            download={`${slug}-qr.png`}
            className="rounded-full border border-[#dcd8d1] px-3.5 py-2 text-[0.8125rem] font-semibold"
          >
            Download PNG
          </a>
          <a
            href={`/${slug}/qr`}
            download={`${slug}-qr.svg`}
            className="rounded-full border border-[#dcd8d1] px-3.5 py-2 text-[0.8125rem] font-semibold"
          >
            Download SVG
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-[#e3e0da] bg-white p-5">
        <h3 className="text-[0.875rem] font-semibold">Your link</h3>
        <div className="mt-2.5 flex gap-2">
          <input className="bf-input" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="flex-none rounded-lg bg-[#14161a] px-3.5 text-[0.8125rem] font-semibold text-white"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- history */

interface VersionRow {
  id: string;
  created_at: string;
  source: string;
}

/**
 * Every save snapshots the previous document, so "I broke my page" is
 * self-service. This is what makes it safe to hand someone the builder.
 */
function HistoryTab({ slug, canRestore }: { slug: string; canRestore: boolean }) {
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/builder/${slug}/versions`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? "Could not load history.");
        if (live) setVersions(body.versions ?? []);
      } catch (err) {
        if (live) {
          setVersions([]);
          setError(err instanceof Error ? err.message : "Could not load history.");
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  async function restore(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/builder/${slug}/versions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not restore.");
      // Reload so the editor and preview both show the restored document.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore.");
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-[#e3e0da] bg-white p-5">
      <h3 className="text-[0.875rem] font-semibold">Earlier versions</h3>
      <p className="mt-1 text-[0.75rem] leading-snug text-[#7c828c]">
        We keep the last twenty saves. If something looks wrong, put it back —
        restoring is itself undoable.
      </p>

      {error ? (
        <p className="mt-3 text-[0.8125rem] text-[#c62a2a]" role="alert">
          {error}
        </p>
      ) : null}

      {versions === null ? (
        <p className="mt-4 text-[0.8125rem] text-[#8a9099]">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="mt-4 text-[0.8125rem] text-[#8a9099]">
          No earlier versions yet — they appear once you&apos;ve saved a change.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#f0ede7]">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="text-[0.8125rem]">
                {new Date(v.created_at).toLocaleString()}
              </span>
              <span className="text-[0.75rem] text-[#8a9099]">
                {v.source === "staff" ? "changed by Golodex" : v.source === "api" ? "via API" : "changed by you"}
              </span>

              {confirming === v.id ? (
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy === v.id}
                    onClick={() => restore(v.id)}
                    className="rounded-full bg-[#14161a] px-3 py-1 text-[0.75rem] font-semibold text-white disabled:opacity-40"
                  >
                    {busy === v.id ? "Restoring…" : "Yes, restore"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-full border border-[#dcd8d1] px-3 py-1 text-[0.75rem] font-semibold"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!canRestore}
                  onClick={() => setConfirming(v.id)}
                  className="ml-auto rounded-full border border-[#dcd8d1] px-3 py-1 text-[0.75rem] font-semibold disabled:opacity-40"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
