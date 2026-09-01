"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentBlock } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * The page concierge, visitor side.
 *
 * Labelled as an assistant everywhere it can be, because the honest framing is
 * also the useful one: a stranger will ask it the blunt questions they would
 * not open by asking a person.
 */
export function AgentChat({
  block,
  slug,
  ownerName,
}: {
  block: AgentBlock;
  slug: string;
  ownerName: string;
}) {
  const firstName = ownerName.split(" ")[0] || ownerName;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const suggestions = block.suggestions?.length
    ? block.suggestions
    : [`What does ${firstName} do?`, "How do I get started?", "What area do they cover?"];

  useEffect(() => {
    // Keep the newest turn in view without yanking the whole page.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, blockId: block.id, messages: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "The assistant is unavailable right now.");
      setMessages([...next, { role: "assistant", content: body.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gx-card gx-card--block overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 pt-4">
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
          style={{ background: "var(--gx-accent-soft)", color: "var(--gx-accent)" }}
          aria-hidden="true"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a8 8 0 0 1 8 8v3a7 7 0 0 1-7 7H8l-4 2 1-4a8 8 0 0 1-1-4v-4a8 8 0 0 1 8-8z" />
            <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="gx-display truncate text-[1.0625rem] font-semibold">
            {block.title ?? `Ask about ${firstName}`}
          </h3>
          <p className="text-[0.6875rem]" style={{ color: "var(--gx-text-faint)" }}>
            AI assistant · answers from this page
          </p>
        </div>
      </header>

      <div
        ref={logRef}
        className="mt-3 max-h-80 space-y-2.5 overflow-y-auto px-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <p className="text-[0.9375rem] leading-relaxed" style={{ color: "var(--gx-text-muted)" }}>
            {block.greeting ??
              `Hi — I can answer questions about ${firstName} and what they do. What would you like to know?`}
          </p>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p
              className="max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-relaxed whitespace-pre-line"
              style={
                m.role === "user"
                  ? { background: "var(--gx-accent)", color: "var(--gx-accent-ink)" }
                  : {
                      background: "color-mix(in srgb, var(--gx-text) 8%, transparent)",
                      color: "var(--gx-text)",
                    }
              }
            >
              {m.content}
            </p>
          </div>
        ))}

        {busy ? (
          <div className="flex justify-start">
            <p
              className="rounded-2xl px-3.5 py-2.5 text-[0.9375rem]"
              style={{ background: "color-mix(in srgb, var(--gx-text) 8%, transparent)" }}
            >
              <span className="gx-dots" aria-label="Thinking">
                <i /><i /><i />
              </span>
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-[0.8125rem]" role="alert" style={{ color: "#e5484d" }}>
            {error}
          </p>
        ) : null}
      </div>

      {messages.length === 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 px-4">
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full px-3 py-1.5 text-[0.8125rem] transition-transform hover:-translate-y-px"
              style={{
                border: "1px solid color-mix(in srgb, var(--gx-text) 16%, transparent)",
                color: "var(--gx-text-muted)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="mt-3 flex items-center gap-2 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="gx-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${firstName}…`}
          aria-label={`Ask about ${firstName}`}
          maxLength={500}
          disabled={busy}
        />
        <button
          type="submit"
          className="gx-icon-btn flex-none"
          disabled={busy || !input.trim()}
          aria-label="Send"
          style={{ opacity: busy || !input.trim() ? 0.5 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </section>
  );
}
