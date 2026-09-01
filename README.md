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

### Saving is closed by default

Per-user authentication **does not exist yet**. `PUT /api/builder/:slug` writes
only when `GOLODEX_EDITOR_TOKEN` is set and the browser presents a matching
`gx_editor` cookie. Without it the endpoint returns 503 and the builder opens in
preview mode.

That is a single-operator lock for preview deploys: **one token currently grants
edit rights to every page.** It is correct for one person and wrong the moment a
second person signs up — real per-account auth has to land before the builder is
opened to customers.

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
  data/seed.ts                   built-in /hlt and /demo pages
```

---

## Not built yet

- **Per-account auth.** The single biggest gap. The builder exists and works,
  but it is gated behind one shared operator token (see above). Nothing
  multi-user ships until this does.
- **The claim flow.** `claim_token` is generated and stored; the `/claim/:token`
  route that binds a gifted page to a new login is not written.
- **Image uploads.** Photo fields take URLs; there's no uploader wired to
  Supabase Storage yet.
- **Drag-and-drop reordering.** Blocks reorder with up/down buttons, which are
  more reliable and more accessible; DnD is a polish item.
- **Billing.** No Stripe; `plan` is set by the caller and trusted.
- **Custom domains** for pro customers.
