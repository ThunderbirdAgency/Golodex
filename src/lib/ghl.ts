import { env, hasGhlAgency, hasGhlLeadSync } from "./env";

/**
 * GoHighLevel API v2 client.
 *
 * Two distinct credentials are in play and they are not interchangeable:
 *
 *  - `GHL_AGENCY_TOKEN`  — agency-level Private Integration Token. Required to
 *    create sub-accounts. Sub-account creation is only available on the Agency
 *    Pro ($497) plan; on lower plans `createSubAccount` will surface GHL's own
 *    403 rather than pretending to succeed.
 *  - `GHL_DEFAULT_LOCATION_TOKEN` — a location-level token for the shared
 *    "golodex.com" sub-account, where leads land when a page has no sub-account
 *    of its own.
 */

const BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

export class GhlError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "GhlError";
  }

  /** 429 and 5xx are worth another attempt; 4xx are not. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

interface RequestOptions {
  token: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Total attempts including the first. */
  attempts?: number;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  const attempts = opts.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Version: API_VERSION,
          Accept: "application/json",
          ...(opts.body ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
        cache: "no-store",
      });

      const text = await res.text();
      const parsed = text ? safeJson(text) : null;

      if (!res.ok) {
        throw new GhlError(
          extractMessage(parsed) ?? `GHL ${res.status} on ${path}`,
          res.status,
          parsed ?? text,
        );
      }
      return parsed as T;
    } catch (err) {
      lastError = err;
      const retryable = err instanceof GhlError ? err.retryable : true;
      if (!retryable || attempt === attempts) break;
      // 400ms, 800ms, 1600ms — enough to ride out a rate-limit window.
      await sleep(400 * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new GhlError("GHL request failed", 0, lastError);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message === "string") return b.message;
  if (Array.isArray(b.message)) return b.message.join("; ");
  if (typeof b.error === "string") return b.error;
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- contacts */

export interface UpsertContactInput {
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  source?: string;
  /** GHL custom fields, keyed by field id. */
  customFields?: { id: string; value: string }[];
}

export interface UpsertContactResult {
  contactId: string;
  /** True when GHL matched an existing contact rather than creating one. */
  existing: boolean;
}

/**
 * Create or update a contact by email/phone within a sub-account.
 * Upsert (not create) so a repeat visitor does not fragment into duplicates.
 */
export async function upsertContact(
  input: UpsertContactInput,
  token?: string,
): Promise<UpsertContactResult> {
  const authToken = token ?? env.ghlDefaultLocationToken;
  if (!authToken) throw new GhlError("No GHL location token configured.", 0);
  if (!input.email && !input.phone) {
    throw new GhlError("A contact needs an email or a phone number.", 400);
  }

  const [first, ...rest] = (input.name ?? "").trim().split(/\s+/);

  const payload = {
    locationId: input.locationId,
    firstName: input.firstName ?? (first || undefined),
    lastName: input.lastName ?? (rest.length ? rest.join(" ") : undefined),
    email: input.email,
    phone: input.phone,
    tags: input.tags ?? [],
    source: input.source ?? "Golodex",
    customFields: input.customFields,
  };

  const res = await request<{ contact?: { id?: string }; new?: boolean; traceId?: string }>(
    "/contacts/upsert",
    { token: authToken, method: "POST", body: payload },
  );

  const contactId = res?.contact?.id;
  if (!contactId) throw new GhlError("GHL upsert returned no contact id.", 502, res);

  return { contactId, existing: res.new === false };
}

/** Attach a note to a contact — used to carry the free-text message. */
export async function addContactNote(
  contactId: string,
  body: string,
  token?: string,
): Promise<void> {
  const authToken = token ?? env.ghlDefaultLocationToken;
  if (!authToken) return;
  await request(`/contacts/${contactId}/notes`, {
    token: authToken,
    method: "POST",
    body: { body },
    attempts: 2,
  });
}

/* --------------------------------------------------------------- locations */

export interface CreateSubAccountInput {
  name: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  /** Snapshot to load — pipelines, workflows, and the Golodex lead automations. */
  snapshotId?: string;
}

export interface CreateSubAccountResult {
  locationId: string;
}

/**
 * Provision a dedicated GHL sub-account.
 *
 * Cost note for whoever runs this: sub-accounts are unlimited in seat count on
 * Agency Unlimited, but the create endpoint itself is gated to Agency Pro, and
 * every live sub-account carries its own phone/email usage. Provisioning one
 * per free gifted page does not scale — see `shouldProvisionSubAccount`.
 */
export async function createSubAccount(
  input: CreateSubAccountInput,
): Promise<CreateSubAccountResult> {
  if (!hasGhlAgency) {
    throw new GhlError(
      "GHL agency credentials are not configured (GHL_AGENCY_TOKEN, GHL_COMPANY_ID).",
      0,
    );
  }

  const res = await request<{ id?: string; _id?: string; location?: { id?: string } }>("/locations/", {
    token: env.ghlAgencyToken!,
    method: "POST",
    body: {
      name: input.name,
      companyId: env.ghlCompanyId,
      phone: input.phone,
      website: input.website,
      city: input.city,
      state: input.state,
      country: input.country ?? "US",
      postalCode: input.postalCode,
      timezone: input.timezone ?? "America/Phoenix",
      prospectInfo: input.email
        ? { firstName: input.firstName, lastName: input.lastName, email: input.email }
        : undefined,
      snapshotId: input.snapshotId ?? env.ghlSnapshotId,
    },
    // Creating a sub-account is not idempotent — one retry only, for transport
    // failures, to avoid provisioning duplicates.
    attempts: 2,
  });

  const locationId = res?.id ?? res?._id ?? res?.location?.id;
  if (!locationId) throw new GhlError("GHL returned no location id.", 502, res);

  return { locationId };
}

/* ----------------------------------------------------------------- routing */

export type Plan = "free" | "pro" | "business";

/**
 * Whether a page's owner gets their own sub-account.
 *
 * Gifted and free pages route into the shared Golodex sub-account, tagged by
 * page slug, so 1,000 giveaways cost one sub-account instead of 1,000. Paying
 * customers get their own, which is what makes the upgrade worth buying.
 */
export function shouldProvisionSubAccount(plan: Plan): boolean {
  return plan === "pro" || plan === "business";
}

/** Where a page's leads should go, given its own sub-account (if any). */
export function resolveLeadDestination(profileLocationId?: string | null): {
  locationId: string;
  token: string;
} | null {
  if (profileLocationId && env.ghlAgencyToken) {
    // Agency tokens can act on any sub-account under the company.
    return { locationId: profileLocationId, token: env.ghlAgencyToken };
  }
  if (hasGhlLeadSync) {
    return { locationId: env.ghlDefaultLocationId!, token: env.ghlDefaultLocationToken! };
  }
  return null;
}

export { hasGhlAgency, hasGhlLeadSync };
