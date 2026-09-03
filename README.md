# Golodex

The modern rolodex — a link-in-bio and digital business card built for real
estate agents, loan officers, and other people who close deals in person.

Replaces the current GoHighLevel funnel pages behind `golodex.com` and
`golodex.com/hlt` with a real application: a themed page renderer, a lead
pipeline into GHL, and an API that can create finished pages in bulk so they can
be given away as gifts.

---

## Why this exists

The pages live today as GoHighLevel funnel-builder pages. That has two problems
this repo solves:

1. **They look dated.** The funnel builder produces generic layouts and there is
   no shared design system across pages.
2. **They can't be automated.** GHL's funnel builder has no API for
   programmatically creating a page, so gifting a page to a thousand agents means
   a thousand manual clones.

---

## Stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | Next.js 15 (App Router), React 19        |
| Styling    | Tailwind v4 + CSS custom-property themes |
| Database   | Supabase (Postgres, Auth, Storage)       |
| CRM        | GoHighLevel API v2                       |
| Hosting    | Vercel                                   |

Runs with **zero environment variables** — the seeded pages `/hlt` and `/demo`
render from `src/data/seed.ts`. Add credentials as you switch each capability on.

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## How a page works

A page is **one JSON document**, not a tree of database rows:

```ts
Profile = {
  slug, displayName, headline, bio, avatar, cover, logo,
  theme:   Theme,          // 10 presets, or fully custom
  blocks:  Block[],        // ordered content
  contact: ContactCard,    // drives the .vcf download
  disclosure,              // compliance footer (NMLS, brokerage)
}
```

That shape is deliberate: gifting a page has to be a single API call that returns
a live URL, and the whole page renders from one indexed lookup by slug.

### Block types

`about` · `work` · `agent` · `link` · `cta` · `socials` · `video` · `calendar` ·
`leadform` · `listings` · `testimonial` · `text` · `heading` · `gallery` · `embed`

The product is a digital business card, not a storefront — so the blocks that
carry it are the ones that explain a person:

- **`about`** — *who I am / what I do / why it matters*, plus up to three proof
  facts. A visitor should be able to decide about someone from this block alone.
- **`work`** — examples of things they've actually done.
- **`agent`** — an AI assistant that answers a stranger's questions about them.

Together with the `.vcf` download and the QR code, those are what no competitor
ships.

### Themes

Ten presets in `src/lib/themes.ts` — Ivory, Slate, Linen, Midnight, Onyx,
Coastal, Aurora, Terracotta, Forest, Noir Gold.

Only `accent` and `background` come from the user. Every other color — text,
muted text, borders, card fills, button ink — is **derived** in
`themeToCssVars()`. An agent picking a brand color on their phone cannot produce
an unreadable page, because button label contrast is computed, not guessed.

---

## The builder

`/edit/:slug` is the logged-in page builder. Two properties matter:

- **The preview is the real renderer.** The phone on the right runs the same
  components that serve the live page, so what someone builds is exactly what a
  visitor gets — not an approximation.
- **Forms are generated, not hand-written.** Every block's editor comes from a
  descriptor in `src/lib/blockdefs.ts`. Adding a block type means adding one
  entry there plus a renderer; the editor needs no changes.

Four tabs: **Content** (add / reorder / hide / edit blocks), **Design** (ten
presets plus accent, background, mood, cards, corners and type), **You** (header,
contact card, disclosure) and **Share** (QR download, link).

### Guardrails — powerful, hard to break

Self-service only works if a customer can't wreck what we set up for them:

- **Locked blocks.** Staff can lock a block (the compliance footer, the booking
  link). The owner can still reorder and hide it — reversible, visible actions —
  but cannot edit or delete it. Enforced in `PUT /api/builder/:slug` via
  `lib/locks.ts`, not just greyed out in the UI, so editing the request body
  doesn't get around it. Owners also cannot *add* locks.
- **Undo**, on every change, before anything is saved.
- **Delete confirmation** on every block.
- **Version history.** A database trigger snapshots the previous document on
  every save and keeps the last twenty. The History tab restores any of them,
  and restoring is itself a save — so an accidental restore is undoable too.

---

## Accounts and access

Authentication is **Supabase Auth magic links**. There are no passwords, and
auth is not hand-rolled.

### Roles

| Role | Sees |
| --- | --- |
| `owner` | `/dashboard` and the builder for their own page only |
| `staff` | Everything above, plus `/admin`: every account, every page, any builder |
| `admin` | Everything above, plus the ability to create and re-role staff |

Two rules hold everywhere:

- **Identity comes from the verified session; permissions come from a fresh
  read of the `accounts` row.** No role is ever read from a cookie or trusted
  from a request body.
- **Middleware is not the security boundary.** It runs on the edge without
  service-role access, so it cannot see roles — it only redirects signed-out
  visitors so they don't see a broken screen. Every page and route handler
  re-checks permission server-side.

### No self-signup

`shouldCreateUser: false`, plus an active `accounts` row is required. A stranger
who knows a customer's email cannot create an account, and the sign-in endpoint
returns an identical response whether or not an address is registered, so it
can't be used to enumerate customers.

Staff create accounts in `/admin` → **New account**, which provisions the login,
optionally builds their first page, and emails them a sign-in link.

### Supabase setup

1. Run both migrations (`supabase db push`, or paste them into the SQL editor).
2. Set the env vars in `.env.example`.
3. **Add your first admin by hand** — there is no bootstrap route, deliberately:

   ```sql
   -- After inviting yourself from the Supabase dashboard (Authentication → Users):
   insert into public.accounts (user_id, email, full_name, role)
   values ('<your auth user id>', 'you@example.com', 'Your Name', 'admin');
   ```

4. **Change the magic-link email template** (Authentication → Email Templates →
   Magic Link) to use the token-hash flow:

   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
   ```

   The default template uses PKCE, which only works in the browser that
   requested the link — magic links get opened on phones all the time. The
   callback accepts both flows, but this one survives switching device.

5. Set **Site URL** and add `<your domain>/auth/callback` to the redirect
   allowlist.

---

## The AI page assistant

The `agent` block answers a visitor's questions about the page owner, grounded
only in that page's own content plus a private `knowledge` note the owner writes
in the builder.

Two rules shape the whole design:

1. **It is an assistant *about* the person, never the person.** It speaks in the
   third person and says plainly that it's an assistant if asked. A visitor who
   thinks they're messaging the actual agent and later learns otherwise is a
   trust failure on a page whose entire job is trust.
2. **It never invents facts.** Rates, pricing, availability, timelines and
   credentials are exactly what strangers ask and exactly what causes real harm
   when guessed, so an unknown becomes a handoff to the booking link.

Runs on `claude-opus-5` at `effort: "low"` (visitors want an instant reply, not
a considered essay), with the page facts under a cache breakpoint since they're
identical across every visitor's turn. Needs `ANTHROPIC_API_KEY`; without it the
block returns a clear "not switched on yet" message.

---

## QR codes

`/:slug/qr` — SVG by default, `?format=png&size=2048` for print.

Error-correction level **H** (~30% recoverable) with a real quiet zone, because
this is the bridge from the physical world: business cards, yard signs, name
badges, a phone held up across a table. Caller-supplied colors are accepted only
as plain hex, so nobody can generate a light-on-light code that won't scan.

---

## The automation API

This is what your other system calls to gift a page.

### Create a page

```http
POST /api/v1/pages
Authorization: Bearer gx_live_…
Content-Type: application/json
```

```json
{
  "displayName": "Dana Reyes",
  "headline": "Realtor® · Phoenix, AZ",
  "phone": "+16025550134",
  "email": "dana@example.com",
  "calendarUrl": "https://api.leadconnectorhq.com/widget/booking/abc123",
  "theme": "ivory",
  "socials": { "instagram": "https://instagram.com/danareyes" },
  "status": "claimable",
  "plan": "free"
}
```

```json
201 {
  "url":      "https://golodex.com/danareyes",
  "vcardUrl": "https://golodex.com/danareyes/vcard",
  "claimUrl": "https://golodex.com/claim/xY9…",
  "slug":     "danareyes"
}
```

Omit `blocks` and the page is composed for you — socials, a featured booking CTA,
call/email/website rows, and a lead form, in a deliberate order. Pass `blocks`
explicitly for full control.

Slug behaviour is intentional: an **explicit** `slug` that is taken returns `409`
(it may already be printed on a business card), while a **derived** slug falls
back to `name-2`, `name-3`, … so bulk gifting never hard-fails.

### Other endpoints

| Endpoint                   | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `GET /api/v1/pages/:slug`  | Read the stored document                   |
| `PATCH /api/v1/pages/:slug`| Shallow-merge changes (`blocks` replaces)  |
| `POST /api/leads`          | Public lead capture (used by the form)     |
| `POST /api/track`          | Public analytics beacon                    |
| `GET /:slug/vcard`         | Public `.vcf` download                     |

Auth is `Authorization: Bearer` or `x-api-key`. Keys are stored as SHA-256
hashes; `GOLODEX_API_KEY` is a bootstrap key for before any are provisioned.

---

## GoHighLevel integration

### Lead routing

Every form submission is **written to Postgres first**, then pushed to GHL. A GHL
outage costs you a sync, never a lead — failures are recorded on
`leads.sync_status` for retry.

Contacts are tagged `golodex` and `page:<slug>`, which is what lets a single
shared sub-account hold leads for thousands of gifted pages and still route them
to the right person.

### Sub-accounts — read this before choosing a plan

Two facts that constrain the design:

- `POST /locations/` (sub-account creation) is **gated to the Agency Pro
  ($497/mo) plan**. On Unlimited ($297) sub-accounts are free but not
  API-creatable.
- Sub-accounts are unlimited in count on those plans, but each live one carries
  its own phone/email usage and its own row in your agency view.

So `shouldProvisionSubAccount()` implements a tiered policy:

| Plan       | Where leads go                                  |
| ---------- | ----------------------------------------------- |
| `free`     | Shared `golodex.com` sub-account, tagged by slug |
| `pro`      | Its own GHL sub-account                          |
| `business` | Its own GHL sub-account                          |

**Giving 1,000 agents their own sub-account is not the right default.** It turns
a free giveaway into 1,000 live CRM tenants to administer, and makes the agency
view unusable. Tagged routing in one sub-account gives the same lead
organization; a dedicated sub-account then becomes a concrete reason to upgrade.

That said, the policy is one function — if you want every signup provisioned,
change `shouldProvisionSubAccount` to return `true` and set the Agency Pro
credentials.

---

## Database

`supabase/migrations/0001_init.sql` creates:

`accounts` · `profiles` · `leads` · `events` · `api_keys` · `ghl_provisioning`

RLS is on for every table. Published profiles are world-readable (that is the
product); owners see their own leads and analytics; `api_keys` and
`ghl_provisioning` are service-role only.

```bash
supabase db push          # or paste the SQL into the Supabase SQL editor
```

---

## Deploying over the existing site

`golodex.com` currently serves GHL funnel pages, so **do not point DNS at this
app until `/hlt` is verified here.** Suggested order:

1. Deploy to Vercel and test on the preview domain.
2. Fill in the real values marked `TODO` in `src/data/seed.ts` (see below).
3. Move `/hlt` into Supabase, confirm it against the current live page.
4. Cut DNS over.

### Outstanding TODOs on the `/hlt` seed

These are placeholders because the real values weren't available:

- **`license`** — currently `NMLS #0000000`. A wrong or placeholder NMLS number
  on a live mortgage page is a compliance problem. Fill this in before launch.
- **`avatar`** — omitted, so the page renders an "EM" monogram. Add the real
  headshot; a stock photo of an unrelated person would misrepresent him.
- **`phone`** — empty, which hides the tap-to-call button in the action bar.
- Link URLs (booking, application, guide) were inferred from the current live
  page and should be confirmed.

---

## Layout

```
src/
  app/
    page.tsx                     marketing homepage
    [slug]/page.tsx              public profile renderer
    [slug]/vcard/route.ts        .vcf download
    api/leads/route.ts           lead capture -> Postgres -> GHL
    api/track/route.ts           analytics beacon
    api/v1/pages/                automation API
  components/
    icons.tsx                    one hand-built icon family
    profile/                     header, blocks, lead form, action bar, agent chat
    builder/                     the page builder and its generated forms
    marketing/PhonePreview.tsx   live theme switcher on the homepage
  lib/
    types.ts     document model          themes.ts   theme engine + presets
    schema.ts    zod validation          color.ts    contrast-safe derivation
    ghl.ts       GoHighLevel client      repo.ts     persistence
    pagebuilder.ts  compose a page       slug.ts     slug rules + reserved words
    auth.ts      session + authorization security.ts rate limits, URL/SQL guards
    locks.ts     locked-block enforcement redirect.ts open-redirect guard
  data/seed.ts                   built-in /hlt and /demo pages
```

---

## Security posture

Verified by `npm test` (30 assertions in `tests/guards.test.ts`, each one
covering a vulnerability that was genuinely reachable at some point):

| Fixed | Was |
| --- | --- |
| **Write privileges revoked** from `anon`/`authenticated` on every table (`0003`) | Supabase grants `ALL` on `public` by default, so a row-scoped UPDATE policy let a customer PATCH their own `accounts` row via PostgREST and set `role: "admin"` — becoming staff over every account and page. The same hole on `profiles.doc` bypassed lock enforcement and could set a `verified` badge. |
| Restore re-applies current locked blocks | A snapshot taken *before* a block was locked doesn't contain it, so restoring an old version deleted the block and its lock together — a complete bypass of every lock |
| Duplicate block ids rejected | Lock checks keyed blocks by id into a `Map`, which keeps the *last* entry: a payload with both a tampered and a pristine copy passed while the page rendered the tampered one |
| Slug lookups use `.eq()` on a normalized slug | `.ilike()` treated `%` as a wildcard, so `/%` could resolve to — and grant edit rights on — an arbitrary page |
| `resolveEmbed` rejects non-http(s) | `new URL()` accepts `javascript:`, and an iframe with a `javascript:` src executes it, so page content could script a visitor |
| Admin search terms stripped of PostgREST syntax | `,` `.` `(` `)` in a search term could restructure the `.or()` filter |
| `safeNextPath` allowlists same-site paths | post-login `?next=` was an open-redirect sink |
| Staff limited to customer accounts | a staff login could suspend an admin and lock the owner out |

The first three were found by a dedicated adversarial review pass *after* the
feature work looked finished, which is the argument for running one.

**The rule the first finding teaches: an RLS policy is not a column-level
control.** Row scoping says *which rows*; the `GRANT` says *which columns*. All
writes in this app go through the service-role client, so `authenticated` holds
no write privilege at all — the API is the only write path, enforced by the
database rather than by convention.

Also in place: CSP and the usual headers (`next.config.ts`), `no-store` on every
signed-in route and API, RLS on every table with a `SECURITY DEFINER is_staff()`
helper (pinned `search_path`), rate limits on the public write endpoints, and
`timingSafeEqual` for API-key comparison.

Known limits, stated rather than hidden:

- **CSP allows `'unsafe-inline'` for scripts**, because the App Router injects an
  inline bootstrap. Tightening it needs nonce plumbing through middleware. The
  policy still blocks script from unnamed origins.
- **Rate limits are per-instance and in-memory.** On serverless the real ceiling
  is `limit x instances`. Anything that must hold globally needs Redis/Upstash.
- **No audit log** of staff actions on customer pages. `page_versions` records
  that a change came from staff, which is not the same thing.

---

## Not built yet

- **The claim flow.** `claim_token` is generated and stored; the `/claim/:token`
  route that binds a gifted page to a new login is not written.
- **Image uploads.** Photo fields take URLs; there's no uploader wired to
  Supabase Storage yet.
- **Drag-and-drop reordering.** Blocks reorder with up/down buttons, which are
  more reliable and more accessible; DnD is a polish item.
- **Billing.** No Stripe; `plan` is set by the caller and trusted.
- **Custom domains** for pro customers.
