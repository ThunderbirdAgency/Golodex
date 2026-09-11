import { getAccount } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeSlug } from "@/lib/slug";
import { planOf } from "@/lib/plans";
import { clientIp, rateLimit } from "@/lib/security";
import { csvDocument } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lead export.
 *
 * The Pro plan advertises "Export your leads any time". It said so before this
 * route existed, which is the wrong order — a plan should never promise
 * something absent. This closes that gap.
 *
 * Scope: `?slug=` exports one page; omitting it exports every page the caller
 * owns. Staff may export any page by slug, because answering "where did my
 * leads go" is a support question. Staff do NOT get a slug-less export — that
 * would dump every lead in the system into a spreadsheet on one click.
 */

const COLUMNS = [
  "created_at",
  "page",
  "name",
  "email",
  "phone",
  "message",
  "tags",
  "source",
  "referrer",
  "sync_status",
] as const;

export async function GET(req: Request) {
  if (!rateLimit(`leads-export:${clientIp(req)}`, 10, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "This deployment has no database configured." },
      { status: 503 },
    );
  }

  const staff = account.role === "staff" || account.role === "admin";

  // Gating is on the plan, not on the presence of leads: a free account with
  // leads still cannot export them, which is the whole point of the line on
  // the pricing page. Staff are exempt because this doubles as a support tool.
  if (!staff && !planOf(account.plan).limits.leadExport) {
    return NextResponse.json(
      { error: "Lead export is a Pro feature." },
      { status: 403 },
    );
  }

  const slug = normalizeSlug(new URL(req.url).searchParams.get("slug") ?? "");

  // Resolve pages first, so the lead query is always scoped by profile id and
  // never by a value taken straight from the query string.
  let pages: { id: string; slug: string }[] = [];

  if (slug) {
    const { data } = await admin
      .from("profiles")
      .select("id, slug, account_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }
    if (!staff && String(data.account_id ?? "") !== account.id) {
      return NextResponse.json({ error: "You don't have access to that page." }, { status: 403 });
    }
    pages = [{ id: String(data.id), slug: String(data.slug) }];
  } else {
    const { data } = await admin
      .from("profiles")
      .select("id, slug")
      .eq("account_id", account.id);

    pages = (data ?? []).map((r) => ({ id: String(r.id), slug: String(r.slug) }));
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages to export." }, { status: 404 });
  }

  const slugById = new Map(pages.map((p) => [p.id, p.slug]));

  const { data: leads, error } = await admin
    .from("leads")
    .select("created_at, profile_id, name, email, phone, message, tags, source, referrer, sync_status")
    .in("profile_id", pages.map((p) => p.id))
    .order("created_at", { ascending: false })
    .limit(10_000);

  if (error) {
    console.error("[leads/export] query failed", error.message);
    return NextResponse.json({ error: "Export failed. Try again." }, { status: 502 });
  }

  const rows = (leads ?? []).map((lead) => {
    const r = lead as Record<string, unknown>;
    return [
      r.created_at,
      slugById.get(String(r.profile_id)) ?? "",
      r.name,
      r.email,
      r.phone,
      r.message,
      r.tags,
      r.source,
      r.referrer,
      r.sync_status,
    ];
  });

  const csv = csvDocument(COLUMNS, rows);

  const stamp = new Date().toISOString().slice(0, 10);
  const name = slug ? `golodex-leads-${slug}-${stamp}.csv` : `golodex-leads-${stamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
