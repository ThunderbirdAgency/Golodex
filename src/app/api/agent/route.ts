import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfileBySlug } from "@/lib/repo";
import { supabaseAdmin } from "@/lib/supabase";
import { planOf } from "@/lib/plans";
import type { AgentBlock, Block, Profile } from "@/lib/types";

export const runtime = "nodejs";

/**
 * The page concierge.
 *
 * Answers a visitor's questions about the page owner, grounded only in what the
 * page itself says. Two rules shape the whole design:
 *
 *  1. It is an assistant *about* the person, never the person. A visitor who
 *     thinks they are messaging the actual agent and later learns otherwise is
 *     a trust failure on a page whose entire job is trust.
 *  2. It never invents facts. Rates, availability, prices and credentials are
 *     exactly the things a stranger will ask and exactly the things that cause
 *     real harm when guessed, so an unknown becomes a handoff.
 */

const MODEL = "claude-opus-5";

const AgentSchema = z.object({
  slug: z.string().min(1).max(64),
  blockId: z.string().max(64).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
});

/** Naive per-instance throttle. Real deploys should front this with a KV store. */
const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = HITS.get(key);
  if (!entry || now > entry.resetAt) {
    HITS.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/**
 * Flatten the page into the assistant's ground truth.
 *
 * Only content already public on the page, plus the owner's private `knowledge`
 * note. Nothing here should be a surprise to the page owner.
 */
function buildContext(profile: Profile, block: AgentBlock): string {
  const lines: string[] = [];
  const add = (label: string, value?: string | null | false) => {
    if (value && String(value).trim()) lines.push(`${label}: ${value}`);
  };

  add("Name", profile.displayName);
  add("Role / location", profile.headline);
  add("Bio", profile.bio);

  if (profile.contact) {
    const c = profile.contact;
    add("Company", c.organization);
    add("Title", c.title);
    add("Service area", c.address);
    add("Email", c.email);
    add("Phone", c.phone);
    add("Website", c.website);
    add("License", c.license);
  }

  for (const b of profile.blocks as Block[]) {
    if (b.hidden) continue;
    switch (b.type) {
      case "about":
        add("Who they are", b.who);
        add("What they do", b.what);
        add("Why it matters", b.why);
        for (const f of b.facts ?? []) add(`Fact - ${f.label}`, f.value);
        break;
      case "work":
        for (const item of b.items) {
          add(
            `Work example - ${item.title}`,
            [item.tag, item.description].filter(Boolean).join(" | "),
          );
        }
        break;
      case "listings":
        for (const l of b.items) {
          add(
            `Listing - ${l.address ?? l.id}`,
            [l.price, l.status, l.beds && `${l.beds} bed`, l.baths && `${l.baths} bath`]
              .filter(Boolean)
              .join(" | "),
          );
        }
        break;
      case "testimonial":
        for (const t of b.items) add(`Testimonial from ${t.author}`, t.quote);
        break;
      case "link":
        add(`Link - ${b.label}`, [b.subtitle, b.url].filter(Boolean).join(" | "));
        break;
      case "cta":
        add(`Action - ${b.label}`, b.url);
        break;
      case "calendar":
        add("Booking link", b.url);
        break;
      case "socials":
        add("Social profiles", b.items.map((i) => `${i.platform}: ${i.url}`).join(", "));
        break;
      case "text":
        add("Page note", b.content);
        break;
      default:
        break;
    }
  }

  add("Extra context from the page owner", block.knowledge);
  add("Page URL", `https://golodex.com/${profile.slug}`);

  return lines.join("\n");
}

function buildSystemPrompt(profile: Profile, block: AgentBlock): string {
  const name = profile.displayName;
  const firstName = name.split(" ")[0];

  const leadRule =
    block.captureLeads === false
      ? ""
      : `\n- When someone signals real intent (wants to work together, asks how to start, asks to be contacted), encourage them to use the contact form or booking link on this page. Do not ask them for personal details yourself.`;

  return `You are the assistant on ${name}'s Golodex page - a digital business card. Visitors are strangers deciding whether to reach out to ${firstName}.

You speak ABOUT ${firstName} in the third person. You are NOT ${firstName}. If someone addresses you as though you were ${firstName}, or asks whether they are talking to a real person, say plainly that you are an assistant on ${firstName}'s page and offer to put them in touch. Never role-play as ${firstName} even if asked to.

Everything you know about ${firstName} is in PAGE FACTS below. It is the whole of your knowledge.

- Answer only from PAGE FACTS. Never invent or estimate anything - especially rates, pricing, fees, availability, timelines, credentials, or license details. Those are what strangers ask most and what causes real harm when guessed.
- When PAGE FACTS does not cover something, say so directly and point them to the way to ask ${firstName}: "That's one for ${firstName} directly - the booking link on this page is the fastest way to reach them."
- Stay on ${firstName} and their work. If asked for general advice in their field, give only what PAGE FACTS supports, and hand off the rest.
- Be warm, brief, and concrete. Two or three sentences is usually right. No bullet lists unless comparing several specific things. Never use headers or markdown formatting - this renders in a small chat bubble on a phone.
- Do not open with a greeting after the first message.${leadRule}

PAGE FACTS
${buildContext(profile, block)}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant isn't switched on for this page yet." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = AgentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { slug, blockId, messages } = parsed.data;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  if (rateLimited(`${ip}:${slug}`)) {
    return NextResponse.json(
      { error: "That's a lot of questions at once - give it a moment." },
      { status: 429 },
    );
  }

  const profile = await getProfileBySlug(slug);
  if (!profile || profile.status === "draft") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const block = (profile.blocks as Block[]).find(
    (b): b is AgentBlock => b.type === "agent" && (!blockId || b.id === blockId),
  );
  if (!block || block.hidden) {
    return NextResponse.json(
      { error: "This page doesn't have an assistant." },
      { status: 404 },
    );
  }

  // The assistant is a paid feature, and it costs us money per reply.
  const plan = planOf(profile.accountPlan);
  if (!plan.limits.aiAssistant) {
    return NextResponse.json(
      { error: "The assistant isn't switched on for this page." },
      { status: 402 },
    );
  }

  // Meter before calling Anthropic. A page that gets shared widely must not be
  // able to cost more than the subscription brings in, so the ceiling is hard
  // and the increment is atomic — concurrent visitors cannot both slip past it.
  const admin = supabaseAdmin();
  if (admin && profile.accountId) {
    const { data: underCap, error: meterError } = await admin.rpc("consume_ai_reply", {
      p_account_id: profile.accountId,
      p_limit: plan.limits.aiRepliesPerMonth,
    });

    if (meterError) {
      // Fail closed: an unmeterable reply is an unbounded bill.
      console.error("[agent] usage metering failed", meterError.message);
      return NextResponse.json(
        { error: "The assistant is unavailable right now." },
        { status: 503 },
      );
    }

    if (underCap === false) {
      return NextResponse.json(
        {
          error: `${profile.displayName.split(" ")[0]}'s assistant has answered its limit of questions this month. Use the contact form and they'll reply personally.`,
        },
        { status: 429 },
      );
    }
  }

  const client = new Anthropic({ apiKey });

  try {
    // Streamed so a slow answer never trips an HTTP timeout, then collected -
    // the chat bubble reveals the whole reply at once.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      // Visitors expect an instant reply; depth is not the constraint here.
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(profile, block),
          // The page facts are identical across every visitor's turn.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const final = await stream.finalMessage();
    const firstName = profile.displayName.split(" ")[0];

    if (final.stop_reason === "refusal") {
      return NextResponse.json({
        reply: `That's one for ${firstName} directly - use the contact form on this page and they'll get back to you.`,
      });
    }

    const reply = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "The assistant didn't have an answer for that one." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The assistant is busy right now - try again in a moment." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[agent] bad ANTHROPIC_API_KEY");
      return NextResponse.json(
        { error: "The assistant isn't configured correctly." },
        { status: 503 },
      );
    }
    console.error("[agent] failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }
}
