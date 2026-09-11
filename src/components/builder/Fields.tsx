"use client";

import { useState } from "react";
import type { FieldDef } from "@/lib/blockdefs";
import { LINK_ICON_CHOICES, SOCIAL_PLATFORM_LIST } from "@/lib/blockdefs";
import { SOCIAL_LABELS } from "@/components/icons";
import type { SocialPlatform } from "@/lib/types";

/** Generic form controls driven by the `FieldDef` descriptors. */

type Rec = Record<string, unknown>;

export function Fields({
  defs,
  value,
  onChange,
}: {
  defs: FieldDef[];
  value: Rec;
  onChange: (patch: Rec) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {defs.map((def) => (
        <Field key={def.key} def={def} value={value[def.key]} onChange={(v) => onChange({ [def.key]: v })} />
      ))}
    </div>
  );
}

function Label({ def }: { def: FieldDef }) {
  return (
    <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">{def.label}</span>
  );
}

function Hint({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="mt-1 block text-[0.75rem] leading-snug text-[#7c828c]">{text}</span>;
}

function Field({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (def.type) {
    case "image":
      return <ImageField def={def} value={value} onChange={onChange} />;

    case "text":
    case "url":
      return (
        <label className="block">
          <Label def={def} />
          <input
            className="bf-input mt-1.5"
            type={def.type === "url" ? "url" : "text"}
            value={(value as string) ?? ""}
            placeholder={"placeholder" in def && def.placeholder ? def.placeholder : undefined}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          <Hint text={"hint" in def ? def.hint : undefined} />
        </label>
      );

    case "textarea":
      return (
        <label className="block">
          <Label def={def} />
          <textarea
            className="bf-input mt-1.5"
            rows={def.rows ?? 3}
            value={(value as string) ?? ""}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          <Hint text={def.hint} />
        </label>
      );

    case "number":
      return (
        <label className="block">
          <Label def={def} />
          <input
            className="bf-input mt-1.5"
            type="number"
            min={def.min}
            max={def.max}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
      );

    case "toggle":
      return (
        <div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#14161a]"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked || undefined)}
            />
            <span className="text-[0.8125rem] font-semibold text-[#2c3038]">{def.label}</span>
          </label>
          <Hint text={def.hint} />
        </div>
      );

    case "select":
      return (
        <label className="block">
          <Label def={def} />
          <select
            className="bf-input mt-1.5"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );

    case "icon":
      return (
        <label className="block">
          <Label def={def} />
          <select
            className="bf-input mt-1.5"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            {LINK_ICON_CHOICES.map((i) => (
              <option key={i || "none"} value={i}>
                {i ? i[0].toUpperCase() + i.slice(1) : "None"}
              </option>
            ))}
          </select>
        </label>
      );

    case "chips":
      return <Chips def={def} value={(value as string[]) ?? []} onChange={onChange} />;

    case "socials":
      return (
        <Socials
          value={(value as { platform: SocialPlatform; url: string }[]) ?? []}
          onChange={onChange}
        />
      );

    case "list":
      return <ListField def={def} value={(value as Rec[]) ?? []} onChange={onChange} />;

    default:
      return null;
  }
}

/* -------------------------------------------------------------------- chips */

function Chips({
  def,
  value,
  onChange,
}: {
  def: Extract<FieldDef, { type: "chips" }>;
  value: string[];
  onChange: (v: unknown) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...value, t]);
    setDraft("");
  };

  return (
    <div>
      <Label def={def} />
      {value.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {value.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#eeece7] px-2.5 py-1 text-[0.75rem] font-medium"
            >
              {chip}
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                className="text-[#8a9099] hover:text-[#14161a]"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        className="bf-input mt-1.5"
        value={draft}
        placeholder={def.placeholder ?? "Type and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      <Hint text={def.hint} />
    </div>
  );
}

/* ------------------------------------------------------------------ socials */

function Socials({
  value,
  onChange,
}: {
  value: { platform: SocialPlatform; url: string }[];
  onChange: (v: unknown) => void;
}) {
  const byPlatform = new Map(value.map((v) => [v.platform, v.url]));

  return (
    <div>
      <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Profiles</span>
      <p className="mt-1 text-[0.75rem] text-[#7c828c]">
        Leave a field blank to hide that icon.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {SOCIAL_PLATFORM_LIST.map((platform) => (
          <label key={platform} className="flex items-center gap-2">
            <span className="w-20 flex-none text-[0.75rem] font-medium text-[#5a6069]">
              {SOCIAL_LABELS[platform]}
            </span>
            <input
              className="bf-input"
              value={byPlatform.get(platform) ?? ""}
              placeholder="https://…"
              onChange={(e) => {
                const url = e.target.value.trim();
                const next = SOCIAL_PLATFORM_LIST.flatMap((p) => {
                  const u = p === platform ? url : (byPlatform.get(p) ?? "");
                  return u ? [{ platform: p, url: u }] : [];
                });
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- list */

function ListField({
  def,
  value,
  onChange,
}: {
  def: Extract<FieldDef, { type: "list" }>;
  value: Rec[];
  onChange: (v: unknown) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const update = (i: number, patch: Rec) =>
    onChange(value.map((item, j) => (j === i ? { ...item, ...patch } : item)));

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIndex(j);
  };

  return (
    <div>
      <Label def={def} />
      <div className="mt-1.5 flex flex-col gap-1.5">
        {value.map((item, i) => {
          const open = openIndex === i;
          const title = String(item[def.titleKey] ?? "") || `Item ${i + 1}`;

          return (
            <div key={String(item.id ?? i)} className="rounded-lg border border-[#e3e0da] bg-white">
              <div className="flex items-center gap-1 px-2.5 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[0.8125rem] font-medium"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                >
                  {title}
                </button>
                <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</IconBtn>
                <IconBtn
                  label="Remove"
                  onClick={() => {
                    onChange(value.filter((_, j) => j !== i));
                    setOpenIndex(null);
                  }}
                >
                  ×
                </IconBtn>
              </div>

              {open ? (
                <div className="border-t border-[#f0ede7] p-3">
                  <Fields
                    defs={def.fields}
                    value={item}
                    onChange={(patch) => update(i, patch)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {value.length < def.max ? (
        <button
          type="button"
          className="bf-add mt-2"
          onClick={() => {
            onChange([...value, { id: `i-${Date.now().toString(36)}${value.length}` }]);
            setOpenIndex(value.length);
          }}
        >
          + {def.addLabel}
        </button>
      ) : null}
    </div>
  );
}

function IconBtn({
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
      className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-[0.875rem] text-[#5a6069] transition-colors hover:bg-[#f1efe9] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- image */

/** Longest edge, in pixels, after downscaling. Plenty for a full-bleed hero. */
const MAX_EDGE = 1600;

/**
 * Downscale and re-encode in the browser before uploading.
 *
 * Three things this buys, in order of how much they matter:
 *
 *  1. A modern phone camera produces a 4–8 MB, 4000px JPEG. Sending that over
 *     a cell connection is the difference between an upload that works and one
 *     the customer gives up on. This ships ~200 KB instead.
 *  2. Re-encoding through a canvas drops every EXIF block, and phone photos
 *     carry GPS coordinates. These images go on a public page; the customer
 *     should not have to know that to be safe from it.
 *  3. The server never has to run a native image library.
 *
 * If anything here fails — an exotic format, a canvas the browser refuses to
 * export — the original file is uploaded unchanged and the server's own size
 * and type checks decide. Never block a valid upload on an optimisation.
 */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough, and already a format we accept: send it as-is.
    if (scale === 1 && file.type !== "image/heic" && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // PNG only when the source was a PNG — logos and screenshots have flat
    // colour and hard edges that JPEG smears, and may be transparent.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, 0.85),
    );

    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function ImageField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = (value as string) ?? "";

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", await downscale(file), file.name);

      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        setError(json.error ?? "Upload failed. Try again.");
        return;
      }
      onChange(json.url);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="block">
      <Label def={def} />

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="mt-1.5 h-20 w-20 rounded-lg border border-[#e3e5e9] object-cover"
        />
      ) : null}

      <div className="mt-1.5 flex items-center gap-2">
        <label
          className={`inline-flex cursor-pointer items-center rounded-lg border border-[#d5d8de] px-3 py-1.5 text-[0.8125rem] font-semibold text-[#2c3038] ${
            busy ? "pointer-events-none opacity-60" : "hover:bg-[#f5f6f8]"
          }`}
        >
          {busy ? "Uploading…" : url ? "Replace photo" : "Upload a photo"}
          <input
            type="file"
            className="sr-only"
            // Only the three types the server accepts. `capture` is left off
            // deliberately: on a phone this shows the camera *and* the photo
            // library, and the headshot people want is almost always already
            // in the library.
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset first, so choosing the same file twice still fires.
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>

        {url ? (
          <button
            type="button"
            className="text-[0.8125rem] font-semibold text-[#7c828c] hover:text-[#2c3038]"
            onClick={() => onChange(undefined)}
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        className="bf-input mt-2"
        type="text"
        value={url}
        placeholder="…or paste an image URL"
        onChange={(e) => onChange(e.target.value || undefined)}
      />

      {error ? (
        <span className="mt-1 block text-[0.75rem] leading-snug text-[#b4232a]">{error}</span>
      ) : (
        <Hint text={"hint" in def ? def.hint : undefined} />
      )}
    </div>
  );
}
