"use client";

import { useState } from "react";
import { PLANS, formatPrice } from "@/lib/plans";

/**
 * Plan and billing, on the customer's own dashboard.
 *
 * Cancelling is one click through to Stripe's portal rather than an email to
 * support — a subscription somebody cannot leave on their own is a complaint
 * waiting to happen, and Stripe already does dunning and invoices properly.
 */
export function BillingCard({
  plan,
  status,
  renewsAt,
  aiUsed,
}: {
  plan: string;
  status: string | null;
  renewsAt: string | null;
  aiUsed: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = PLANS[(plan as keyof typeof PLANS) ?? "free"] ?? PLANS.free;
  const paid = current.id !== "free";

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not open billing.");
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e3e0da] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
            Your plan
          </p>
          <p className="mt-1 text-[1.25rem] font-bold">{current.label}</p>
          {status && status !== "active" ? (
            <p className="mt-1 text-[0.8125rem] text-[#a06a12]">
              {status === "past_due"
                ? "Your last payment didn't go through — update your card to keep Pro features."
                : `Subscription status: ${status}`}
            </p>
          ) : renewsAt && paid ? (
            <p className="mt-1 text-[0.8125rem] text-[#7c828c]">
              Renews {new Date(renewsAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        {paid ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className="rounded-full border border-[#dcd8d1] bg-white px-4 py-2 text-[0.8125rem] font-semibold disabled:opacity-40"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <a
            href="/pricing"
            className="rounded-full bg-[#14161a] px-4 py-2 text-[0.8125rem] font-semibold text-white"
          >
            Upgrade — {formatPrice(PLANS.pro.monthly!)}/mo
          </a>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-[0.8125rem] text-[#c62a2a]" role="alert">
          {error}
        </p>
      ) : null}

      {current.limits.aiAssistant ? (
        <div className="mt-5 border-t border-[#f0ede7] pt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[0.8125rem] font-semibold">Assistant replies this month</p>
            <p className="text-[0.8125rem] tabular-nums text-[#5a6069]">
              {aiUsed} / {current.limits.aiRepliesPerMonth}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f1efe9]">
            <div
              className="h-full rounded-full bg-[#14161a]"
              style={{
                width: `${Math.min(100, (aiUsed / current.limits.aiRepliesPerMonth) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-5 border-t border-[#f0ede7] pt-4 text-[0.8125rem] leading-relaxed text-[#7c828c]">
          Pro adds an AI assistant that answers visitors&apos; questions about you,
          your listings and work examples, leads into your own CRM, and removes
          the Golodex badge.
        </p>
      )}
    </section>
  );
}
