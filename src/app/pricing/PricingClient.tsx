"use client";

import { useEffect, useRef, useState } from "react";
import { PLANS, formatPrice, yearlyAsMonthly, type BillingInterval } from "@/lib/plans";

/**
 * The purchase path.
 *
 * Name first, then email, then pay. Picking the name up front is the point of
 * the product — people are buying golodex.com/theirname — and checking it live
 * means nobody discovers it is taken *after* paying.
 */
export function PricingClient() {
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInHint, setSignInHint] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug.trim()) {
      setStatus("idle");
      setReason(null);
      return;
    }
    setStatus("checking");
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`);
        const body = await res.json();
        setStatus(body.available ? "ok" : "taken");
        setReason(body.reason ?? null);
      } catch {
        setStatus("idle");
      }
    }, 350);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [slug]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (busy || status !== "ok") return;
    setBusy(true);
    setError(null);
    setSignInHint(false);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, email, interval }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSignInHint(Boolean(body?.signIn));
        throw new Error(body?.error ?? "Could not start checkout.");
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const pro = PLANS.pro;
  const price = interval === "year" ? pro.yearly! : pro.monthly!;

  return (
    <div>
      {/* ------------------------------------------------------- interval */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-[#e3e0da] bg-white p-1">
        {(["month", "year"] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterval(i)}
            aria-pressed={interval === i}
            className={`rounded-full px-4 py-2 text-[0.875rem] font-semibold transition-colors ${
              interval === i ? "bg-[#14161a] text-white" : "text-[#5a6069] hover:bg-[#f4f2ee]"
            }`}
          >
            {i === "month" ? "Monthly" : "Yearly"}
            {i === "year" ? (
              <span className={interval === "year" ? "ml-1.5 opacity-70" : "ml-1.5 text-[#1a7f4b]"}>
                save 20%
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------- plans */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="self-start rounded-2xl border border-[#e3e0da] bg-white p-6">
          <h2 className="text-[1.0625rem] font-semibold">{PLANS.free.label}</h2>
          <p className="mt-1 text-[0.875rem] text-[#5a6069]">{PLANS.free.tagline}</p>
          <p className="mt-4 text-[2rem] font-bold tracking-tight">$0</p>
          <ul className="mt-5 flex flex-col gap-2 text-[0.875rem]">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
            {PLANS.free.missing?.map((f) => (
              <li key={f} className="flex gap-2 text-[#a8adb5]">
                <span aria-hidden="true">—</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[0.8125rem] leading-relaxed text-[#7c828c]">
            Free pages are set up by us — ask and we&apos;ll make you one.
          </p>
        </section>

        <section className="rounded-2xl border-2 border-[#14161a] bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.0625rem] font-semibold">{pro.label}</h2>
            <span className="rounded-full bg-[#14161a] px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
              Most popular
            </span>
          </div>
          <p className="mt-1 text-[0.875rem] text-[#5a6069]">{pro.tagline}</p>

          <p className="mt-4 text-[2rem] font-bold tracking-tight">
            {formatPrice(price)}
            <span className="ml-1 text-[0.9375rem] font-medium text-[#8a9099]">
              /{interval === "year" ? "year" : "month"}
            </span>
          </p>
          {interval === "year" ? (
            <p className="mt-1 text-[0.8125rem] text-[#1a7f4b]">
              {yearlyAsMonthly(pro.yearly!)}/month, billed once
            </p>
          ) : null}

          <ul className="mt-5 flex flex-col gap-2 text-[0.875rem]">
            {pro.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {/* ------------------------------------------------- checkout */}
          <form onSubmit={checkout} className="mt-6 border-t border-[#f0ede7] pt-5">
            <label className="block">
              <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">
                Claim your name
              </span>
              <span className="mt-1.5 flex items-center overflow-hidden rounded-lg border border-[#e3e0da] bg-white focus-within:border-[#14161a]">
                <span className="pl-3 text-[0.875rem] text-[#8a9099]">golodex.com/</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 pr-3 text-[0.875rem] outline-none"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="yourname"
                  maxLength={30}
                  autoComplete="off"
                  required
                  aria-describedby="slug-status"
                />
              </span>
            </label>

            <p id="slug-status" className="mt-1.5 min-h-[1.25rem] text-[0.75rem]" aria-live="polite">
              {status === "checking" ? (
                <span className="text-[#8a9099]">Checking…</span>
              ) : status === "ok" ? (
                <span className="text-[#1a7f4b]">golodex.com/{slug} is available.</span>
              ) : status === "taken" ? (
                <span className="text-[#c62a2a]">{reason ?? "That name is taken."}</span>
              ) : null}
            </p>

            <label className="mt-2 block">
              <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Email</span>
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
                {error}{" "}
                {signInHint ? (
                  <a className="font-semibold underline underline-offset-2" href="/login">
                    Sign in
                  </a>
                ) : null}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || status !== "ok" || !email.trim()}
              className="mt-4 w-full rounded-full bg-[#14161a] px-5 py-3 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-40"
            >
              {busy ? "Taking you to checkout…" : `Get Pro — ${formatPrice(price)}/${interval === "year" ? "yr" : "mo"}`}
            </button>

            <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-[#8a9099]">
              Secure checkout by Stripe. Cancel any time from your dashboard.
            </p>
          </form>
        </section>
      </div>

      <p className="mt-8 text-center text-[0.875rem] text-[#5a6069]">
        Running a team or a brokerage?{" "}
        <a
          className="font-semibold underline decoration-[#dcd8d1] underline-offset-2"
          href="mailto:hello@golodex.com?subject=Golodex%20for%20our%20team"
        >
          Talk to us
        </a>
      </p>
    </div>
  );
}
