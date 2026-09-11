import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/security";
import { sniffImage } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Image upload for the page builder.
 *
 * Photo fields used to accept a URL and nothing else, which meant a customer
 * on a phone — where the headshot actually lives — had no way to use one.
 *
 * Three rules, each here for a reason:
 *
 *  1. **Type is decided by magic bytes, never by the filename or the
 *     `Content-Type` header.** Both are attacker-controlled. `evil.svg`
 *     renamed to `nice.png` with `image/png` announced would otherwise land in
 *     a public bucket and be served back with an image content type — and SVG
 *     carries script, on pages that strangers visit.
 *  2. **SVG is refused outright**, even a well-formed one, for the same reason.
 *  3. **The path is derived from the session, never from the request.** The
 *     account id comes out of the verified session and the filename is a fresh
 *     UUID, so no caller can write into another account's folder or overwrite
 *     an existing object by guessing its name.
 *
 * The write uses the service role. There is deliberately no storage INSERT
 * policy for `authenticated` (see migration 0005): a policy would let a
 * signed-in customer PUT straight at the Storage API and skip every check
 * above.
 */

/** Hard ceiling. The builder downscales before sending; this catches the rest. */
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  // Uploads cost storage and bandwidth, so they are limited harder than saves.
  if (!rateLimit(`upload:${clientIp(req)}`, 20, 60_000).ok) {
    return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });
  }

  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "This deployment has no storage configured." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }

  // Check the declared size first so an oversized body is refused before it is
  // read into memory.
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 5 MB. Try a smaller one." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "That image is over 5 MB. Try a smaller one." },
      { status: 413 },
    );
  }

  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json(
      { error: "Please upload a JPEG, PNG or WebP image." },
      { status: 415 },
    );
  }

  const key = `${account.id}/${crypto.randomUUID()}.${kind.ext}`;

  const { error } = await admin.storage.from("page-media").upload(key, bytes, {
    contentType: kind.mime,
    // Never overwrite: the key is a fresh UUID, so a collision would mean
    // something is wrong rather than something to paper over.
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    console.error("[upload] storage write failed", error.message);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 502 });
  }

  const { data } = admin.storage.from("page-media").getPublicUrl(key);

  return NextResponse.json({ url: data.publicUrl });
}
