import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccount } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createProfile, slugIsTaken } from "@/lib/repo";
import { buildProfile, resolveTheme } from "@/lib/pagebuilder";
import { normalizeSlug, slugFromName, validateSlug } from "@/lib/slug";
import { ThemeSchema } from "@/lib/schema";
import { env } from "@/lib/env";
import { clientIp, rateLimit, sanitizeSearchTerm } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Staff account management.
 *
 * Every handler re-checks the caller's role from the database. Middleware only
 * proves someone is signed in; it cannot see roles, so it is never the boundary
 * for these routes.
 */

async function requireStaff() {
  const account = await getAccount();
  if (!account) return { ok: false as const, status: 401 as const, error: "Please sign in." };
  if (account.role !== "staff" && account.role !== "admin") {
    // Deliberately a 404: a customer probing /api/admin learns nothing about
    // whether the endpoint exists.
    return { ok: false as const, status: 404 as const, error: "Not found." };
  }
  return { ok: true as const, account };
}

/** GET — every account with its pages, for the console list. */
export async function GET(req: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  // `,` `.` `(` `)` are PostgREST filter syntax, so a raw term could
  // restructure the query rather than just search with it.
  const raw = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const q = raw ? sanitizeSearchTerm(raw) : undefined;

  let query = admin
    .from("accounts")
    .select("id, email, full_name, role, status, plan, gifted_by, staff_note, last_seen_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);

  const { data: accounts, error } = await query;
  if (error) {
    console.error("[admin] list accounts failed", error.message);
    return NextResponse.json({ error: "Could not load accounts." }, { status: 500 });
  }

  const ids = (accounts ?? []).map((a) => String(a.id));
  const { data: pages } = ids.length
    ? await admin
        .from("profiles")
        .select("id, slug, status, account_id, updated_at")
        .in("account_id", ids)
    : { data: [] as Record<string, unknown>[] };

  return NextResponse.json({
    accounts: accounts ?? [],
    pages: pages ?? [],
  });
}

const SocialsSchema = z
  .record(
    z.enum([
      "instagram", "facebook", "tiktok", "youtube", "linkedin",
      "x", "threads", "pinterest", "zillow", "whatsapp", "website",
    ]),
    z.string().max(2000),
  )
  .optional();

const CreateSchema = z.object({
  email: z.string().email().max(160),
  fullName: z.string().min(1).max(120),
  role: z.enum(["owner", "staff", "admin"]).default("owner"),
  plan: z.enum(["free", "pro", "business"]).default("free"),
  staffNote: z.string().max(500).optional(),
  /** Send the invite email now, or create the account quietly. */
  sendInvite: z.boolean().default(true),

  /** Optional first page, created and owned by the new account. */
  page: z
    .object({
      slug: z.string().max(40).optional(),
      displayName: z.string().min(1).max(80).optional(),
      headline: z.string().max(120).optional(),
      bio: z.string().max(600).optional(),
      phone: z.string().max(40).optional(),
      website: z.string().max(2000).optional(),
      calendarUrl: z.string().max(2000).optional(),
      theme: z.union([z.string().max(40), ThemeSchema.partial()]).optional(),
      socials: SocialsSchema,
    })
    .optional(),
});

/** POST — create an account, optionally with its first page, and invite them. */
export async function POST(req: Request) {
  // Creating accounts sends mail and provisions auth users.
  if (!rateLimit(`admin-create:${clientIp(req)}`, 20, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the form.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const email = input.email.trim().toLowerCase();

  // Only an admin may mint another staff or admin account. Staff can create
  // customers, not peers — privilege escalation is the thing to prevent here.
  if (input.role !== "owner" && auth.account.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can create staff accounts." },
      { status: 403 },
    );
  }

  const { data: dupe } = await admin
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (dupe) {
    return NextResponse.json({ error: "An account already uses that email." }, { status: 409 });
  }

  // Create the auth user. `inviteUserByEmail` both creates and emails; when
  // staff want to stage an account silently we create the user without mail.
  let userId: string;
  if (input.sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/auth/callback?next=%2Fdashboard`,
    });
    if (error || !data.user) {
      console.error("[admin] invite failed", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Could not send the invite." },
        { status: 502 },
      );
    }
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error("[admin] createUser failed", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Could not create the user." },
        { status: 502 },
      );
    }
    userId = data.user.id;
  }

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({
      user_id: userId,
      email,
      full_name: input.fullName,
      role: input.role,
      plan: input.plan,
      staff_note: input.staffNote ?? null,
      gifted_by: auth.account.email,
    })
    .select("id, email, full_name, role, plan, status")
    .single();

  if (accountError || !account) {
    // Roll the auth user back so a failed insert doesn't leave an orphan that
    // blocks the email from being used again.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    console.error("[admin] account insert failed", accountError?.message);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }

  // Optional first page.
  let page: { slug: string; url: string } | null = null;
  if (input.page) {
    const displayName = input.page.displayName ?? input.fullName;
    const requested = input.page.slug
      ? normalizeSlug(input.page.slug)
      : slugFromName(displayName);
    const check = validateSlug(requested);

    if (!check.ok) {
      return NextResponse.json(
        { ok: true, account, page: null, note: `Account created, but the slug was rejected: ${check.reason}` },
        { status: 201 },
      );
    }
    if (await slugIsTaken(check.slug)) {
      return NextResponse.json(
        { ok: true, account, page: null, note: `Account created, but golodex.com/${check.slug} is taken.` },
        { status: 201 },
      );
    }

    const doc = buildProfile(
      check.slug,
      { ...input.page, displayName },
      input.page.theme,
    );
    doc.theme = resolveTheme(input.page.theme);

    try {
      await createProfile({
        slug: check.slug,
        doc,
        status: "published",
        accountId: String(account.id),
      });
      page = { slug: check.slug, url: `${env.siteUrl}/${check.slug}` };
    } catch (err) {
      console.error("[admin] page create failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { ok: true, account, page: null, note: "Account created, but the page could not be." },
        { status: 201 },
      );
    }
  }

  return NextResponse.json({ ok: true, account, page }, { status: 201 });
}

const PatchSchema = z.object({
  accountId: z.string().uuid(),
  status: z.enum(["active", "suspended"]).optional(),
  role: z.enum(["owner", "staff", "admin"]).optional(),
  plan: z.enum(["free", "pro", "business"]).optional(),
  staffNote: z.string().max(500).optional(),
});

/** PATCH — suspend, reactivate, re-plan, or re-role an account. */
export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { accountId, ...changes } = parsed.data;

  if (changes.role && auth.account.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can change roles." }, { status: 403 });
  }
  // Nobody demotes or suspends themselves by accident, and an admin cannot
  // lock the whole team out by suspending their own account.
  if (accountId === auth.account.id && (changes.role || changes.status)) {
    return NextResponse.json(
      { error: "You can't change your own role or status." },
      { status: 400 },
    );
  }

  // A staff member may administer customers, not peers. Without this a staff
  // login could suspend an admin and lock the owner out of their own console.
  const { data: target } = await admin
    .from("accounts")
    .select("role")
    .eq("id", accountId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (target.role !== "owner" && auth.account.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can change a staff account." },
      { status: 403 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (changes.status) patch.status = changes.status;
  if (changes.role) patch.role = changes.role;
  if (changes.plan) patch.plan = changes.plan;
  if (changes.staffNote !== undefined) patch.staff_note = changes.staffNote;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { error } = await admin.from("accounts").update(patch).eq("id", accountId);
  if (error) {
    console.error("[admin] patch failed", error.message);
    return NextResponse.json({ error: "Could not update the account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
