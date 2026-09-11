import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { planOf } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { Shell } from "@/components/app/Shell";
import { BillingCard } from "@/components/app/BillingCard";

export const metadata: Metadata = {
  title: "My page",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * What a customer sees after signing in.
 *
 * One question answered above the fold: is my page live, and how do I change
 * it? Everything else — views, leads — is supporting detail.
 */
export default async function DashboardPage() {
  const account = await getAccount();
  if (!account) redirect("/login?next=%2Fdashboard");

  const admin = supabaseAdmin();

  const pages = admin
    ? ((
        await admin
          .from("profiles")
          .select("id, slug, status, updated_at")
          .eq("account_id", account.id)
          .order("created_at", { ascending: true })
      ).data ?? [])
    : [];

  const pageIds = pages.map((p) => String(p.id));

  const [leadCount, viewCount] = admin && pageIds.length
    ? await Promise.all([
        admin.from("leads").select("id", { count: "exact", head: true }).in("profile_id", pageIds),
        admin
          .from("events")
          .select("id", { count: "exact", head: true })
          .in("profile_id", pageIds)
          .eq("kind", "view"),
      ])
    : [{ count: 0 }, { count: 0 }];

  const leadTotal = leadCount?.count ?? 0;
  const canExport = planOf(account.plan).limits.leadExport;

  // Billing + this month's assistant usage, for the plan card.
  const billing = admin
    ? (
        await admin
          .from("accounts")
          .select("subscription_status, current_period_end")
          .eq("id", account.id)
          .maybeSingle()
      ).data
    : null;

  const period = new Date();
  const periodKey = `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const aiUsed = admin
    ? ((
        await admin
          .from("ai_usage")
          .select("replies")
          .eq("account_id", account.id)
          .eq("period", periodKey)
          .maybeSingle()
      ).data?.replies as number | undefined) ?? 0
    : 0;

  const recentLeads = admin && pageIds.length
    ? ((
        await admin
          .from("leads")
          .select("id, name, email, phone, message, created_at")
          .in("profile_id", pageIds)
          .order("created_at", { ascending: false })
          .limit(8)
      ).data ?? [])
    : [];

  return (
    <Shell
      account={account}
      title={`Hi${account.fullName ? `, ${account.fullName.split(" ")[0]}` : ""}`}
      subtitle="Your page, and who's been getting in touch."
    >
      {pages.length === 0 ? (
        <div className="rounded-2xl border border-[#e3e0da] bg-white p-8 text-center">
          <h2 className="text-[1.0625rem] font-semibold">No page yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-[#5a6069]">
            We&apos;re still setting yours up. You&apos;ll get an email the moment it&apos;s ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <BillingCard
            plan={account.plan}
            status={(billing?.subscription_status as string | null) ?? null}
            renewsAt={(billing?.current_period_end as string | null) ?? null}
            aiUsed={aiUsed}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Page views" value={viewCount?.count ?? 0} />
            <Stat label="Enquiries" value={leadTotal} />
            <Stat label="Status" value={pages[0].status === "published" ? "Live" : "Draft"} />
          </div>

          {pages.map((page) => (
            <section
              key={String(page.id)}
              className="rounded-2xl border border-[#e3e0da] bg-white p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
                    Your page
                  </p>
                  <p className="mt-1 truncate text-[1.125rem] font-bold">
                    golodex.com/{String(page.slug)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/${String(page.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#dcd8d1] bg-white px-4 py-2 text-[0.8125rem] font-semibold"
                  >
                    View
                  </a>
                  <a
                    href={`/edit/${String(page.slug)}`}
                    className="rounded-full bg-[#14161a] px-4 py-2 text-[0.8125rem] font-semibold text-white"
                  >
                    Edit my page
                  </a>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-[#f0ede7] pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${String(page.slug)}/qr`}
                  alt={`QR code for golodex.com/${String(page.slug)}`}
                  width={72}
                  height={72}
                  className="flex-none rounded-lg border border-[#ece9e3] p-1"
                />
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-semibold">Your QR code</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-snug text-[#7c828c]">
                    Put it on a card or a sign.{" "}
                    <a
                      className="font-medium text-[#5a6069] underline decoration-[#dcd8d1] underline-offset-2"
                      href={`/${String(page.slug)}/qr?format=png&size=2048`}
                      download
                    >
                      Download
                    </a>
                  </p>
                </div>
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-[#e3e0da] bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[1.0625rem] font-semibold">Recent enquiries</h2>
              {/*
                Only shown when there is something to download and the plan
                includes it. The route re-checks both — this is the signpost,
                not the gate.
              */}
              {canExport && leadTotal > 0 ? (
                <a
                  className="text-[0.8125rem] font-semibold underline underline-offset-4"
                  href="/api/leads/export"
                >
                  Export all as CSV
                </a>
              ) : null}
            </div>
            {recentLeads.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-[#7c828c]">
                Nothing yet. They&apos;ll show up here as people reach out.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#f0ede7]">
                {recentLeads.map((lead) => (
                  <li key={String(lead.id)} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[0.9375rem] font-semibold">
                        {(lead.name as string) || "Someone"}
                      </p>
                      <p className="text-[0.75rem] text-[#8a9099]">
                        {new Date(String(lead.created_at)).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[0.8125rem] text-[#5a6069]">
                      {[lead.email, lead.phone].filter(Boolean).join(" · ")}
                    </p>
                    {lead.message ? (
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#5a6069]">
                        {String(lead.message)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#e3e0da] bg-white px-5 py-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
        {label}
      </p>
      <p className="mt-1 text-[1.5rem] font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { Shell } from "@/components/app/Shell";
import { BillingCard } from "@/components/app/BillingCard";

export const metadata: Metadata = {
  title: "My page",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * What a customer sees after signing in.
 *
 * One question answered above the fold: is my page live, and how do I change
 * it? Everything else — views, leads — is supporting detail.
 */
export default async function DashboardPage() {
  const account = await getAccount();
  if (!account) redirect("/login?next=%2Fdashboard");

  const admin = supabaseAdmin();

  const pages = admin
    ? ((
        await admin
          .from("profiles")
          .select("id, slug, status, updated_at")
          .eq("account_id", account.id)
          .order("created_at", { ascending: true })
      ).data ?? [])
    : [];

  const pageIds = pages.map((p) => String(p.id));

  const [leadCount, viewCount] = admin && pageIds.length
    ? await Promise.all([
        admin.from("leads").select("id", { count: "exact", head: true }).in("profile_id", pageIds),
        admin
          .from("events")
          .select("id", { count: "exact", head: true })
          .in("profile_id", pageIds)
          .eq("kind", "view"),
      ])
    : [{ count: 0 }, { count: 0 }];

  // Billing + this month's assistant usage, for the plan card.
  const billing = admin
    ? (
        await admin
          .from("accounts")
          .select("subscription_status, current_period_end")
          .eq("id", account.id)
          .maybeSingle()
      ).data
    : null;

  const period = new Date();
  const periodKey = `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const aiUsed = admin
    ? ((
        await admin
          .from("ai_usage")
          .select("replies")
          .eq("account_id", account.id)
          .eq("period", periodKey)
          .maybeSingle()
      ).data?.replies as number | undefined) ?? 0
    : 0;

  const recentLeads = admin && pageIds.length
    ? ((
        await admin
          .from("leads")
          .select("id, name, email, phone, message, created_at")
          .in("profile_id", pageIds)
          .order("created_at", { ascending: false })
          .limit(8)
      ).data ?? [])
    : [];

  return (
    <Shell
      account={account}
      title={`Hi${account.fullName ? `, ${account.fullName.split(" ")[0]}` : ""}`}
      subtitle="Your page, and who's been getting in touch."
    >
      {pages.length === 0 ? (
        <div className="rounded-2xl border border-[#e3e0da] bg-white p-8 text-center">
          <h2 className="text-[1.0625rem] font-semibold">No page yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-[#5a6069]">
            We&apos;re still setting yours up. You&apos;ll get an email the moment it&apos;s ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <BillingCard
            plan={account.plan}
            status={(billing?.subscription_status as string | null) ?? null}
            renewsAt={(billing?.current_period_end as string | null) ?? null}
            aiUsed={aiUsed}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Page views" value={viewCount?.count ?? 0} />
            <Stat label="Enquiries" value={leadCount?.count ?? 0} />
            <Stat label="Status" value={pages[0].status === "published" ? "Live" : "Draft"} />
          </div>

          {pages.map((page) => (
            <section
              key={String(page.id)}
              className="rounded-2xl border border-[#e3e0da] bg-white p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
                    Your page
                  </p>
                  <p className="mt-1 truncate text-[1.125rem] font-bold">
                    golodex.com/{String(page.slug)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/${String(page.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#dcd8d1] bg-white px-4 py-2 text-[0.8125rem] font-semibold"
                  >
                    View
                  </a>
                  <a
                    href={`/edit/${String(page.slug)}`}
                    className="rounded-full bg-[#14161a] px-4 py-2 text-[0.8125rem] font-semibold text-white"
                  >
                    Edit my page
                  </a>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-[#f0ede7] pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${String(page.slug)}/qr`}
                  alt={`QR code for golodex.com/${String(page.slug)}`}
                  width={72}
                  height={72}
                  className="flex-none rounded-lg border border-[#ece9e3] p-1"
                />
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-semibold">Your QR code</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-snug text-[#7c828c]">
                    Put it on a card or a sign.{" "}
                    <a
                      className="font-medium text-[#5a6069] underline decoration-[#dcd8d1] underline-offset-2"
                      href={`/${String(page.slug)}/qr?format=png&size=2048`}
                      download
                    >
                      Download
                    </a>
                  </p>
                </div>
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-[#e3e0da] bg-white p-6">
            <h2 className="text-[1.0625rem] font-semibold">Recent enquiries</h2>
            {recentLeads.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-[#7c828c]">
                Nothing yet. They&apos;ll show up here as people reach out.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#f0ede7]">
                {recentLeads.map((lead) => (
                  <li key={String(lead.id)} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[0.9375rem] font-semibold">
                        {(lead.name as string) || "Someone"}
                      </p>
                      <p className="text-[0.75rem] text-[#8a9099]">
                        {new Date(String(lead.created_at)).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[0.8125rem] text-[#5a6069]">
                      {[lead.email, lead.phone].filter(Boolean).join(" · ")}
                    </p>
                    {lead.message ? (
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#5a6069]">
                        {String(lead.message)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#e3e0da] bg-white px-5 py-4">
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[#8a9099]">
        {label}
      </p>
      <p className="mt-1 text-[1.5rem] font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
