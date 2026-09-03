import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { Shell } from "@/components/app/Shell";
import { AdminConsole, type AccountRow, type PageRow } from "./AdminConsole";

export const metadata: Metadata = {
  title: "Accounts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const account = await getAccount();
  if (!account) redirect("/login?next=%2Fadmin");

  // A customer who guesses this URL gets a 404, not a "forbidden" that
  // confirms the console exists.
  if (account.role !== "staff" && account.role !== "admin") notFound();

  const admin = supabaseAdmin();
  if (!admin) {
    return (
      <Shell account={account} title="Accounts">
        <p className="rounded-xl border border-[#e3e0da] bg-white p-6 text-[0.9375rem] text-[#5a6069]">
          No database is configured on this deployment, so there are no accounts to show.
        </p>
      </Shell>
    );
  }

  const [{ data: accounts }, { data: pages }] = await Promise.all([
    admin
      .from("accounts")
      .select("id, email, full_name, role, status, plan, staff_note, last_seen_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("profiles").select("id, slug, status, account_id, updated_at").limit(500),
  ]);

  return (
    <Shell
      account={account}
      title="Accounts"
      subtitle="Everyone's pages, in one place. Open any builder to make a change for them."
    >
      <AdminConsole
        initialAccounts={(accounts ?? []) as unknown as AccountRow[]}
        initialPages={(pages ?? []) as unknown as PageRow[]}
        viewerRole={account.role === "admin" ? "admin" : "staff"}
        viewerId={account.id}
      />
    </Shell>
  );
}
