"use client";

import { useState } from "react";

/**
 * Magic-link sign-in.
 *
 * Two deliberate properties:
 *
 *  - **No self-signup.** The server sends a link only to an email that already
 *    has an account. Accounts are created by staff, so a stranger cannot mint
 *    one.
 *  - **No email enumeration.** The response is identical whether or not the
 *    address is registered, so this form can't be used to discover who is a
 *    customer.
 */
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong.");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#14161a] text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="M3 7.5l8.2 5.4a1.5 1.5 0 0 0 1.6 0L21 7.5" />
          </svg>
        </div>
        <h1 className="mt-5 text-[1.5rem] font-bold tracking-tight">Check your email</h1>
        <p className="mx-auto mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-[#5a6069]">
          If <span className="font-medium text-[#14161a]">{email}</span> has a Golodex
          account, a sign-in link is on its way. It expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setError(null);
          }}
          className="mt-6 text-[0.875rem] font-semibold underline decoration-[#c9c5bd] underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">Sign in</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#5a6069]">
        We&apos;ll email you a link. No password to remember.
      </p>

      <label className="mt-6 block">
        <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Email</span>
        <input
          className="bf-input mt-1.5"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
        />
      </label>

      {error ? (
        <p className="mt-2.5 text-[0.8125rem] text-[#c62a2a]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending" || !email.trim()}
        className="mt-4 w-full rounded-full bg-[#14161a] px-5 py-3 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-40"
      >
        {state === "sending" ? "Sending…" : "Email me a link"}
      </button>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-[#8a9099]">
        Golodex accounts are set up for you. If you don&apos;t have one yet,{" "}
        <a
          className="font-medium text-[#5a6069] underline decoration-[#dcd8d1] underline-offset-2"
          href="mailto:hello@golodex.com?subject=I%20need%20a%20Golodex%20account"
        >
          get in touch
        </a>
        .
      </p>
    </form>
  );
}
