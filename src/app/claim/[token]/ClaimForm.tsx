"use client";

import { useState } from "react";

export function ClaimForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email, fullName: name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not claim this page.");
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <div>
        <p className="text-[1rem] font-semibold">It&apos;s yours.</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#5a6069]">
          We&apos;ve emailed <span className="font-medium text-[#14161a]">{email}</span> a
          sign-in link. Click it and you can start editing.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="block">
        <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Your name</span>
        <input
          className="bf-input mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          required
        />
      </label>

      <label className="mt-3.5 block">
        <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Your email</span>
        <input
          className="bf-input mt-1.5"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
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
        disabled={state === "sending" || !email.trim() || !name.trim()}
        className="mt-4 w-full rounded-full bg-[#14161a] px-5 py-3 text-[0.9375rem] font-semibold text-white disabled:opacity-40"
      >
        {state === "sending" ? "Claiming…" : "Claim my page"}
      </button>

      <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-[#8a9099]">
        Free, no card. By claiming you agree to our{" "}
        <a className="underline underline-offset-2" href="/legal/terms">terms</a>.
      </p>
    </form>
  );
}
