import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-ssr/server";

export const runtime = "nodejs";

/**
 * Sign out.
 *
 * POST only: a GET would let any page log a user out with an <img> tag, and
 * would be prefetched by browsers.
 */
export async function POST(req: Request) {
  const client = await supabaseServer();
  if (client) await client.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
