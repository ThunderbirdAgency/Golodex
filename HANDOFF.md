# Golodex — Launch Handoff

**For: Claude Code, running locally on Erik's machine.**
**Goal: take Golodex from "code complete" to "a stranger can pay $25 and get a working page."**

Everything that could be built without Erik's credentials is done and pushed.
What remains needs accounts, secrets, or DNS — things only he can provide.

Read this whole file before starting. Work the phases in order; each one is
verifiable on its own, and Phase 1 blocks everything else.

---

## Current state

| | |
|---|---|
| Repo | `ThunderbirdAgency/Golodex` |
| Branch | `claude/golodex-redesign-distribution-kd7um4` (this is the default branch) |
| Live preview | https://golodex.vercel.app — deployed from that branch, publicly reachable |
| Vercel project | `golodex`, team `thunderbird-agency` (`team_fSmicSKlbQbj2RntMmWpJZTg`) |
| Stack | Next.js 15.5.25 (App Router), Supabase, Stripe, Tailwind v4, TypeScript |
| Stripe account | ThunderBird Agency, `acct_1MGGhdBk08Px6wM1` (live mode) |

**Right now the deployment has no environment variables at all.** It runs
entirely on two hardcoded seed pages (`/hlt`, `/demo`) from `src/data/seed.ts`.
Nothing persists. That is expected, and Phase 1 fixes it.

### What is built and working

- Public profile renderer with 15 block types, 10 themes, save-to-contacts
  (`.vcf`), print-ready QR codes, lead capture, analytics.
- Page builder at `/edit/[slug]` with live preview, undo, delete confirmation,
  staff-locked blocks, and version history (last 20 saves, restorable).
- Magic-link auth (Supabase), customer dashboard, staff console over every
  account at `/admin`.
- AI page assistant (Claude) grounded only in the page's own content.
- Stripe checkout, webhook provisioning, billing portal, plan gating, AI usage
  caps. **Code complete, never run against real keys.**
- Automation API (`POST /api/v1/pages`) for gifting pages in bulk.
- Terms and Privacy pages.
- `npm test` — 30 security guard assertions.

### What is NOT built

- Image uploads (photo fields take URLs only) — **Phase 5, highest-value gap**
- Custom domains for customers
- Lead CSV export (advertised on the Pro plan — see Phase 6)
- Any automated test beyond the security guards

---

## Ground rules

1. **Verify, don't assume.** Every phase has a "Definition of done". Actually
   run it. Several bugs in this codebase looked fixed and were not.
2. **Never commit a secret.** `.env.local` is gitignored. Keep it that way.
3. **Run `npm test` and `npm run build` before every commit.**
4. **Do not weaken the security model.** `tests/guards.test.ts` documents seven
   real vulnerabilities that were found and fixed. If a test starts failing,
   the fix is the code, not the test.
5. Commit messages: explain *why*, not just what.

---

## Phase 1 — Supabase (blocks everything)

Nothing persists until this is done.

### 1.1 Create the project

At https://supabase.com/dashboard — new project, region `us-west-1` (closest to
Arizona; Vercel serves from `iad1`, so this is a deliberate trade of write
latency for proximity to the customer base — either is fine).

### 1.2 Run the migrations, in order

`supabase/migrations/` holds four files. Paste each into the SQL editor in
numeric order, or `supabase db push` if the CLI is linked.

| File | What it does |
|---|---|
| `0001_init.sql` | accounts, profiles, leads, events, api_keys, ghl_provisioning + RLS |
| `0002_auth_and_admin.sql` | roles, page version history + snapshot trigger, `is_staff()` |
| `0003_lock_down_writes.sql` | **revokes write privileges** from `anon`/`authenticated` |
| `0004_billing.sql` | Stripe columns, slug reservations, AI usage metering |

**`0003` matters more than it looks.** An earlier version shipped a row-scoped
UPDATE policy on `accounts`; because Supabase grants `ALL` on `public` to
`authenticated` by default, any signed-in customer could `PATCH` their own row
through PostgREST and set `role: "admin"`. `0003` revokes those grants so the
API is the only write path. Do not "simplify" it away.

### 1.3 Local environment

Copy `.env.example` to `.env.local` and fill in from Supabase → Project Settings
→ API:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only, never NEXT_PUBLIC_
```

### 1.4 Make Erik an admin

There is no bootstrap route, deliberately — a self-service "make me admin"
endpoint is exactly the hole `0003` closes.

1. Supabase → Authentication → Users → **Add user** → `EMiller@erikmillerhlt.com`,
   auto-confirm. Copy the resulting user UUID.
2. SQL editor:

```sql
insert into public.accounts (user_id, email, full_name, role, plan, status)
values ('<paste the UUID>', 'emiller@erikmillerhlt.com', 'Erik Miller', 'admin', 'business', 'active');
```

Note the email is stored **lowercase** — `getSession()` matches on it exactly.

### 1.5 Fix the magic-link email template

Supabase → Authentication → Email Templates → **Magic Link**. Replace the body
link with:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
```

Do the same for the **Invite user** template (used by checkout and by the admin
console when creating accounts).

The default template uses PKCE, which only works in the *same browser* that
requested the link. People open magic links on their phone. `/auth/callback`
accepts both flows, but only this one survives switching device.

Then Authentication → URL Configuration:
- Site URL: `http://localhost:3000` for now, `https://golodex.com` at launch
- Redirect allowlist: add `http://localhost:3000/**` and `https://golodex.com/**`
  and `https://golodex.vercel.app/**`

### Definition of done

```bash
npm run dev
```

- `/login` → enter Erik's email → link arrives → clicking it lands on `/admin`
- `/admin` lists his account
- Create a test account from `/admin` → **New account** with a page
- Open that page's builder, change something, **Save**, reload — the change persisted
- The History tab shows the previous version and can restore it

If sign-in fails, check the Supabase **Auth Logs** first — they are far more
specific than the browser error.

---

## Phase 2 — Stripe

### 2.1 Create the products

Erik wants **$25/month** and **$240/year** (a 20% discount). In the Stripe
Dashboard (live mode), create one product `Golodex Pro` with two recurring
prices:

| Price | Amount | Interval |
|---|---|---|
| Monthly | $25.00 USD | Monthly |
| Yearly | $240.00 USD | Yearly |

Copy both price ids (`price_...`).

> Deliberately not created from this session: live-mode products are hard to
> tidy up once made, and Erik should see them appear under his own hand.
> Use **test mode** first — see 2.4.

### 2.2 Environment

```
STRIPE_SECRET_KEY=sk_test_...          # test mode until 2.5
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from 2.3
```

### 2.3 The webhook

Local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

That prints a `whsec_...` — put it in `.env.local`.

For production, Stripe Dashboard → Developers → Webhooks → add endpoint
`https://golodex.com/api/stripe/webhook`, subscribing to exactly:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**The webhook is the only thing that grants paid access.** `/welcome` is
reachable by URL without paying and deliberately provisions nothing.

### 2.4 Test the whole purchase

1. `/pricing` → pick an unused name → watch the live availability check
2. Enter an email → **Get Pro**
3. Pay with `4242 4242 4242 4242`, any future expiry, any CVC
4. You should land on `/welcome`

Then verify in the database:

```sql
select email, plan, subscription_status, stripe_customer_id from public.accounts
order by created_at desc limit 1;
select slug, account_id, status from public.profiles order by created_at desc limit 1;
```

Both rows must exist, plan must be `pro`. The invite email should have arrived.

Also test the failure paths — these matter more than the happy one:

- **Declined card** `4000 0000 0000 0002` → no account created
- **Duplicate name**: try to buy a slug that already exists → 409 before Stripe
- **Forged webhook**: `curl -X POST .../api/stripe/webhook -d '{}'` → 400,
  and no account appears
- **Cancel** from the billing portal → `plan` drops to `free`, **the page stays
  online**, paid blocks stop rendering

### 2.5 Go live

Swap `sk_test_` for `sk_live_`, use the live price ids, create the live webhook
endpoint and use its signing secret. Stripe requires public Terms and Privacy
URLs — they exist at `/legal/terms` and `/legal/privacy`.

> ⚠️ Those legal pages were written to describe honestly what the software
> actually does. **They have not been reviewed by a lawyer.** Get that done
> before taking money at volume. Flag this to Erik explicitly.

---

## Phase 3 — Transactional email

**Do not skip this.** Supabase's built-in sender is rate-limited to a handful of
messages per hour and lands in spam. The magic link *is* the login — if it does
not arrive, the customer cannot use what they just bought.

1. Sign up at [Resend](https://resend.com) and verify `golodex.com`
2. Supabase → Project Settings → Authentication → **SMTP Settings** → enable
   custom SMTP with Resend's credentials
3. Sender: `Golodex <hello@golodex.com>`
4. Set SPF, DKIM and DMARC records as Resend instructs

**Done when:** a magic link to a Gmail address arrives in the inbox, not spam,
within 30 seconds.

---

## Phase 4 — Anthropic (the AI assistant)

```
ANTHROPIC_API_KEY=sk-ant-...
```

The assistant is already gated: Pro only, hard cap of 500 replies per account
per month (`src/lib/plans.ts`), metered atomically in Postgres before each call.

**Verify the cap actually holds** — this is the one that costs real money if it
leaks. Temporarily set `aiRepliesPerMonth: 2` in `plans.ts`, ask a Pro page's
assistant three questions, confirm the third is refused with a handoff message,
then put it back.

Cost note: Opus 5 at low effort with a cached system prompt is roughly a cent or
two per reply. 500 replies is a few dollars against $25 revenue. Watch it for
real once traffic exists.

---

## Phase 5 — Image uploads (highest-value remaining feature)

Every photo field takes a **URL** today. A customer paying $25 will try to
upload a headshot from their phone and can't. This will be the #1 support
ticket. Build it.

1. Supabase → Storage → create a **public** bucket `page-media`
2. Storage policy: authenticated users may insert into a folder named for their
   own account id; everyone may read
3. `POST /api/upload` — authenticated, accepts an image, validates **by magic
   bytes not by extension**, caps at ~5 MB, resizes server-side, writes to
   `page-media/<account_id>/<uuid>.<ext>`, returns the public URL
4. In `src/components/builder/Fields.tsx`, the `image` field type currently
   renders a text input — give it a file picker that uploads and fills the URL
5. Accept `image/jpeg`, `image/png`, `image/webp` only. **Reject SVG** — SVG can
   carry script, and these render on public pages

**Done when:** a customer can upload a headshot from a phone in the builder,
sees it in the live preview immediately, and it appears on the public page.

---

## Phase 6 — Loose ends

- **Lead CSV export.** Advertised on the Pro plan and not built. Either build it
  (`GET /api/leads/export`, owner-or-staff, streams CSV) or remove the line from
  `src/lib/plans.ts`. **Do not ship a plan that promises something absent.**
- **`/hlt` real data.** `src/data/seed.ts` still has no NMLS number, no headshot
  and no phone. The licence line is deliberately omitted rather than showing a
  placeholder — a fabricated NMLS number on a live mortgage page is a
  regulatory problem. Get the real values from Erik.
- **Move `/hlt` into the database.** It is a hardcoded seed page and therefore
  not editable. Recreate it through `/admin` and delete the seed entry.
- **GoHighLevel.** Optional. Without it, leads still save to Postgres and appear
  on the dashboard; they just don't reach GHL. Sub-account creation needs the
  **Agency Pro ($497)** plan — on Unlimited ($297) sub-accounts are free but not
  API-creatable.

---

## Phase 7 — Launch

### 7.1 Vercel environment

Add every variable from `.env.local` to the Vercel project (Production), with
`NEXT_PUBLIC_SITE_URL=https://golodex.com`. Redeploy.

### 7.2 DNS

`golodex.com` currently serves the old GoHighLevel funnel. **Do not cut over
until Phase 1, 2 and 3 are verified in production.**

1. Vercel → project → Domains → add `golodex.com` and `www.golodex.com`
2. Update the A/CNAME records at the registrar as Vercel instructs
3. Wait for the certificate
4. Update `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, and the Stripe webhook URL

`robots.ts` decides indexability from the **Host header**: only `golodex.com` is
indexable, every other host returns `Disallow: /`. So the vercel.app preview
stays out of Google automatically, and the real domain starts being indexed the
moment DNS lands. Nothing to change.

### 7.3 Pre-launch checklist

- [ ] Buy a subscription with a real card, on the real domain, end to end
- [ ] Magic link arrives in a Gmail inbox, not spam
- [ ] Cancel from the billing portal — page stays online, paid features stop
- [ ] Upload a headshot from an actual phone
- [ ] Scan a QR code with an actual phone camera
- [ ] Save a contact card on iOS **and** Android
- [ ] `/hlt` shows the real NMLS number
- [ ] `npm test` passes; `npm run build` clean
- [ ] Lighthouse on `/demo` — mobile score above 90
- [ ] `curl -I https://golodex.com/robots.txt` shows the permissive rules

---

## Architecture notes

Things that will look wrong and are deliberate:

- **A page is one JSON document** (`profiles.doc`), not normalised block rows.
  Gifting a page must be a single API call returning a live URL.
- **`supabaseAdmin()` bypasses RLS.** It answers *what*, never *who* — identity
  always comes from the verified session in `src/lib/auth.ts`.
- **Middleware is not the security boundary.** It runs on the edge without
  service-role access and cannot see roles; it only redirects signed-out
  visitors. Every page and handler re-checks server-side.
- **Locked blocks** are enforced in `src/lib/locks.ts` on save *and* on version
  restore. Duplicate block ids are rejected because a `Map` keyed by id keeps
  the last entry — that was a real bypass.
- **`past_due` still counts as entitled.** A failed card should not black out
  someone's public page while Stripe is retrying.
- **Losing a subscription drops to `free`, never deletes.** Paid blocks stop
  rendering; the document keeps them.

### Key files

```
src/lib/plans.ts        what each plan unlocks — single source of truth
src/lib/auth.ts         session + authorization
src/lib/locks.ts        locked-block enforcement
src/lib/security.ts     rate limits, URL and SQL guards
src/lib/stripe.ts       Stripe client and entitlement
src/lib/blockdefs.ts    add a block type here + a renderer; the editor follows
src/data/seed.ts        the two built-in pages
tests/guards.test.ts    one assertion per vulnerability found and fixed
```

---

## Suggested first message to Claude Code

> Read HANDOFF.md in the repo root, then work Phase 1 (Supabase). I'll paste
> credentials when you ask. Stop after Phase 1's Definition of done and show me
> the result before moving on.
