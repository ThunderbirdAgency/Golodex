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

`link` · `cta` · `socials` · `video` · `calendar` · `leadform` · `listings` ·
`testimonial` · `text` · `heading` · `gallery` · `embed`

`listings` (a swipeable property carousel with price/beds/baths/status) and the
`.vcf` contact download are the two things no competitor ships out of the box.

### Themes

Ten presets in `src/lib/themes.ts` — Ivory, Slate, Linen, Midnight, Onyx,
Coastal, Aurora, Terracotta, Forest, Noir Gold.

Only `accent` and `background` come from the user. Every other color — text,
muted text, borders, card fills, button ink — is **derived** in
`themeToCssVars()`. An agent picking a brand color on their phone cannot produce
an unreadable page, because button label contrast is computed, not guessed.

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
    profile/                     header, blocks, lead form, action bar, media
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

- **Self-serve editor / dashboard.** Pages are created via the API or seed today.
- **Auth and the claim flow.** `claim_token` is generated and stored; the
  `/claim/:token` route that binds a gifted page to a new login is not written.
- **Billing.** No Stripe; `plan` is set by the caller and trusted.
- **Custom domains** for pro customers.
