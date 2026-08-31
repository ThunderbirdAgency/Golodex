import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase";

/**
 * API-key auth for the v1 automation endpoints.
 *
 * Keys are stored as a SHA-256 hash. The plaintext is shown once at creation
 * and is unrecoverable afterwards.
 */

export interface ApiKeyRecord {
  id: string;
  name: string;
  scopes: string[];
}

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext.trim()).digest("hex");
}

/** Accepts `Authorization: Bearer gx_live_…` or `x-api-key: gx_live_…`. */
export function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || null;
  const header = req.headers.get("x-api-key");
  return header?.trim() || null;
}

export type AuthResult =
  | { ok: true; key: ApiKeyRecord }
  | { ok: false; status: number; error: string };

export async function authenticate(req: Request, scope: string): Promise<AuthResult> {
  const plaintext = extractKey(req);
  if (!plaintext) {
    return { ok: false, status: 401, error: "Missing API key." };
  }

  const client = supabaseAdmin();

  // Bootstrap path: a single key in the environment, so the automation API is
  // usable before any keys have been provisioned in the database.
  const bootstrap = process.env.GOLODEX_API_KEY?.trim();
  if (bootstrap) {
    const a = Buffer.from(hashKey(plaintext), "hex");
    const b = Buffer.from(hashKey(bootstrap), "hex");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { ok: true, key: { id: "env", name: "bootstrap", scopes: ["*"] } };
    }
  }

  if (!client) {
    // A bootstrap key exists and did not match, so this is a bad credential —
    // not a misconfigured deployment.
    return bootstrap
      ? { ok: false, status: 401, error: "Invalid API key." }
      : { ok: false, status: 503, error: "API keys are not configured on this deployment." };
  }

  const { data, error } = await client
    .from("api_keys")
    .select("id, name, scopes, revoked_at")
    .eq("key_hash", hashKey(plaintext))
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: "Could not verify API key." };
  if (!data || data.revoked_at) return { ok: false, status: 401, error: "Invalid API key." };

  const scopes = (data.scopes as string[]) ?? [];
  if (!scopes.includes("*") && !scopes.includes(scope)) {
    return { ok: false, status: 403, error: `API key is missing the "${scope}" scope.` };
  }

  // Best-effort; a failed timestamp write must not fail the request.
  void client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return { ok: true, key: { id: String(data.id), name: String(data.name), scopes } };
}
