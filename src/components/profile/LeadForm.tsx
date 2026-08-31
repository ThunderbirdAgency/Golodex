"use client";

import { useState } from "react";
import type { LeadFormBlock } from "@/lib/types";
import { Check } from "@/components/icons";

/**
 * The block that actually earns Golodex its keep: every submit becomes a CRM
 * contact. Optimistic, single-column, no page navigation — a visitor on a phone
 * inside the Instagram browser should never lose their place.
 */
export function LeadForm({ block, slug }: { block: LeadFormBlock; slug: string }) {
  const fields: NonNullable<LeadFormBlock["fields"]> = block.fields?.length
    ? block.fields
    : ["name", "email", "phone"];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          blockId: block.id,
          tags: block.tags ?? [],
          ...data,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <div className="gx-card gx-card--block p-6 text-center">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }}
        >
          <Check size={22} strokeWidth={2.4} />
        </div>
        <p className="gx-display mt-3 text-lg font-semibold">
          {block.successMessage ?? "You're all set."}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--gx-text-muted)" }}>
          I&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="gx-card gx-card--block p-5">
      <h3 className="gx-display text-lg font-semibold">{block.title}</h3>
      {block.description ? (
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--gx-text-muted)" }}>
          {block.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2.5">
        {fields.includes("name") && (
          <input className="gx-input" name="name" placeholder="Full name" autoComplete="name" required />
        )}
        {fields.includes("email") && (
          <input
            className="gx-input"
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            inputMode="email"
          />
        )}
        {fields.includes("phone") && (
          <input
            className="gx-input"
            name="phone"
            type="tel"
            placeholder="Phone number"
            autoComplete="tel"
            inputMode="tel"
          />
        )}
        {fields.includes("message") && (
          <textarea className="gx-input" name="message" rows={3} placeholder="How can I help?" />
        )}
        {/* Bots fill every field they see; humans never see this one. */}
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
      </div>

      {error ? (
        <p className="mt-2.5 text-sm" style={{ color: "#e5484d" }} role="alert">
          {error}
        </p>
      ) : null}

      <button className="gx-button mt-3.5" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : (block.submitLabel ?? "Send")}
      </button>

      <p className="mt-3 text-center text-[0.6875rem] leading-relaxed" style={{ color: "var(--gx-text-faint)" }}>
        By submitting you agree to be contacted about your inquiry. Message and data rates may apply.
      </p>
    </form>
  );
}
