"use client";

import { useMemo, useState } from "react";

/**
 * The staff console.
 *
 * Built for the actual job: we make a lot of these, people ask for changes, and
 * we want to find someone and open their page in two clicks — not navigate a
 * hierarchy. So it is one searchable list, and every row opens the real builder
 * for that page.
 */

export interface AccountRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "staff" | "admin";
  status: "active" | "suspended";
  plan: string;
  staff_note: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface PageRow {
  id: string;
  slug: string;
  status: string;
  account_id: string | null;
  updated_at: string | null;
}

export function AdminConsole({
  initialAccounts,
  initialPages,
  viewerRole,
  viewerId,
}: {
  initialAccounts: AccountRow[];
  initialPages: PageRow[];
  viewerRole: "staff" | "admin";
  viewerId: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [pages, setPages] = useState(initialPages);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const pagesByAccount = useMemo(() => {
    const map = new Map<string, PageRow[]>();
    for (const page of pages) {
      if (!page.account_id) continue;
      map.set(page.account_id, [...(map.get(page.account_id) ?? []), page]);
    }
    return map;
  }, [pages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      const slugs = (pagesByAccount.get(a.id) ?? []).map((p) => p.slug).join(" ");
      return (
        a.email.toLowerCase().includes(q) ||
        (a.full_name ?? "").toLowerCase().includes(q) ||
        slugs.toLowerCase().includes(q)
      );
    });
  }, [accounts, pagesByAccount, query]);

  async function refresh() {
    const res = await fetch("/api/admin/accounts");
    if (!res.ok) return;
    const body = await res.json();
    setAccounts(body.accounts ?? []);
    setPages(body.pages ?? []);
  }

  async function patch(accountId: string, changes: Record<string, unknown>) {
    setFlash(null);
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId, ...changes }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash({ kind: "err", text: body?.error ?? "Could not update." });
      return;
    }
    await refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {flash ? (
        <p
          className={`rounded-lg px-3.5 py-2.5 text-[0.875rem] ${
            flash.kind === "ok"
              ? "bg-[#e9f6ee] text-[#1a6b3f]"
              : "bg-[#fdecec] text-[#a1281f]"
          }`}
          role="status"
        >
          {flash.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="bf-input max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or page…"
          aria-label="Search accounts"
        />
        <span className="text-[0.8125rem] text-[#8a9099]">
          {filtered.length} of {accounts.length}
        </span>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="ml-auto rounded-full bg-[#14161a] px-4 py-2 text-[0.8125rem] font-semibold text-white"
        >
          {creating ? "Cancel" : "New account"}
        </button>
      </div>

      {creating ? (
        <CreateAccount
          canCreateStaff={viewerRole === "admin"}
          onDone={async (message) => {
            setCreating(false);
            setFlash({ kind: "ok", text: message });
            await refresh();
          }}
          onError={(text) => setFlash({ kind: "err", text })}
        />
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#e3e0da] bg-white">
        <table className="w-full min-w-[52rem] border-collapse text-left text-[0.875rem]">
          <thead>
            <tr className="border-b border-[#ece9e3] text-[0.75rem] uppercase tracking-wide text-[#8a9099]">
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Page</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Last seen</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((account) => {
              const own = pagesByAccount.get(account.id) ?? [];
              const isSelf = account.id === viewerId;

              return (
                <tr key={account.id} className="border-b border-[#f4f2ee] last:border-0">
                  <td className="px-4 py-3.5 align-top">
                    <p className="font-semibold">{account.full_name ?? "—"}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-[#5a6069]">{account.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {account.role !== "owner" ? (
                        <Tag tone="dark">{account.role}</Tag>
                      ) : null}
                      {account.status === "suspended" ? <Tag tone="warn">paused</Tag> : null}
                    </div>
                    {account.staff_note ? (
                      <p className="mt-1.5 max-w-xs text-[0.75rem] leading-snug text-[#8a9099]">
                        {account.staff_note}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    {own.length === 0 ? (
                      <span className="text-[#a8adb5]">No page</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {own.map((page) => (
                          <li key={page.id}>
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium underline decoration-[#dcd8d1] underline-offset-2"
                            >
                              /{page.slug}
                            </a>
                            {page.status !== "published" ? (
                              <span className="ml-1.5 text-[0.75rem] text-[#8a9099]">
                                {page.status}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top capitalize">{account.plan}</td>

                  <td className="px-4 py-3.5 align-top text-[#5a6069]">
                    {account.last_seen_at
                      ? new Date(account.last_seen_at).toLocaleDateString()
                      : "Never"}
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {own[0] ? (
                        <a
                          href={`/edit/${own[0].slug}`}
                          className="rounded-full bg-[#14161a] px-3 py-1.5 text-[0.75rem] font-semibold text-white"
                        >
                          Open builder
                        </a>
                      ) : null}
                      {!isSelf ? (
                        <button
                          type="button"
                          onClick={() =>
                            patch(account.id, {
                              status: account.status === "active" ? "suspended" : "active",
                            })
                          }
                          className="rounded-full border border-[#dcd8d1] px-3 py-1.5 text-[0.75rem] font-semibold"
                        >
                          {account.status === "active" ? "Pause" : "Reactivate"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#8a9099]">
                  Nothing matches “{query}”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tag({ tone, children }: { tone: "dark" | "warn"; children: React.ReactNode }) {
  const styles =
    tone === "dark"
      ? "bg-[#14161a] text-white"
      : "bg-[#fdf0dc] text-[#7a5c17]";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ create */

function CreateAccount({
  canCreateStaff,
  onDone,
  onError,
}: {
  canCreateStaff: boolean;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [withPage, setWithPage] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      email: String(form.get("email") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
      role: String(form.get("role") ?? "owner"),
      plan: String(form.get("plan") ?? "free"),
      staffNote: String(form.get("staffNote") ?? "") || undefined,
      sendInvite: form.get("sendInvite") === "on",
    };

    if (withPage) {
      body.page = {
        slug: String(form.get("slug") ?? "") || undefined,
        headline: String(form.get("headline") ?? "") || undefined,
        phone: String(form.get("phone") ?? "") || undefined,
        calendarUrl: String(form.get("calendarUrl") ?? "") || undefined,
        theme: String(form.get("theme") ?? "slate"),
      };
    }

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error ?? "Could not create the account.");
      onDone(
        result.note ??
          (result.page
            ? `Created ${body.email} with golodex.com/${result.page.slug}.`
            : `Created ${body.email}.`),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#e3e0da] bg-white p-5">
      <h2 className="text-[1.0625rem] font-semibold">New account</h2>
      <p className="mt-1 text-[0.8125rem] text-[#7c828c]">
        Creates their login and, if you want, their first page. The invite email
        contains a sign-in link — no password.
      </p>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <label className="block">
          <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Full name</span>
          <input className="bf-input mt-1.5" name="fullName" required maxLength={120} />
        </label>
        <label className="block">
          <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Email</span>
          <input className="bf-input mt-1.5" name="email" type="email" required maxLength={160} />
        </label>
        <label className="block">
          <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Plan</span>
          <select className="bf-input mt-1.5" name="plan" defaultValue="free">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Role</span>
          <select className="bf-input mt-1.5" name="role" defaultValue="owner">
            <option value="owner">Customer</option>
            {canCreateStaff ? <option value="staff">Staff</option> : null}
            {canCreateStaff ? <option value="admin">Admin</option> : null}
          </select>
          {!canCreateStaff ? (
            <span className="mt-1 block text-[0.75rem] text-[#8a9099]">
              Only an admin can create staff logins.
            </span>
          ) : null}
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">
            Note (staff only)
          </span>
          <input
            className="bf-input mt-1.5"
            name="staffNote"
            maxLength={500}
            placeholder="Gifted at the Q3 agent mailer"
          />
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" name="sendInvite" defaultChecked className="h-4 w-4 accent-[#14161a]" />
        <span className="text-[0.8125rem] font-semibold text-[#2c3038]">
          Email them a sign-in link now
        </span>
      </label>

      <label className="mt-2.5 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={withPage}
          onChange={(e) => setWithPage(e.target.checked)}
          className="h-4 w-4 accent-[#14161a]"
        />
        <span className="text-[0.8125rem] font-semibold text-[#2c3038]">
          Create their first page too
        </span>
      </label>

      {withPage ? (
        <div className="mt-4 grid gap-3.5 border-t border-[#f0ede7] pt-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">
              golodex.com/
            </span>
            <input
              className="bf-input mt-1.5"
              name="slug"
              maxLength={40}
              placeholder="Leave blank to use their name"
            />
          </label>
          <label className="block">
            <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">One-liner</span>
            <input
              className="bf-input mt-1.5"
              name="headline"
              maxLength={120}
              placeholder="Realtor® · Phoenix, AZ"
            />
          </label>
          <label className="block">
            <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Phone</span>
            <input className="bf-input mt-1.5" name="phone" maxLength={40} />
          </label>
          <label className="block">
            <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">
              Booking link
            </span>
            <input className="bf-input mt-1.5" name="calendarUrl" maxLength={2000} />
          </label>
          <label className="block">
            <span className="block text-[0.8125rem] font-semibold text-[#2c3038]">Look</span>
            <select className="bf-input mt-1.5" name="theme" defaultValue="slate">
              {["ivory", "slate", "linen", "midnight", "onyx", "coastal", "aurora", "terracotta", "forest", "noirgold"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 rounded-full bg-[#14161a] px-5 py-2.5 text-[0.875rem] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
