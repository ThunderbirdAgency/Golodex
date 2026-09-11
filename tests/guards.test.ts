/**
 * Security guard regression tests.
 *
 * Each assertion here corresponds to a vulnerability that was actually
 * reachable in this codebase at some point:
 *
 *  - `safeNextPath`   — an open redirect on the post-login hop.
 *  - `resolveEmbed`   — `new URL()` accepts `javascript:`, and an iframe with a
 *                       `javascript:` src executes it, so page content could
 *                       script a visitor.
 *  - `sanitizeSearchTerm` — `,` `.` `(` `)` are PostgREST filter syntax, so a
 *                       raw admin search term could restructure the query.
 *  - `normalizeSlug`  — `%` and `_` are LIKE wildcards; slug lookups used
 *                       `ilike`, so `/%` could resolve to an arbitrary page.
 *  - `findLockViolations` — the guarantee that a customer cannot break the
 *                       parts of their page staff set up.
 *  - `sniffImage`     — filename and Content-Type are attacker-chosen, so an
 *                       SVG announced as a PNG would otherwise reach a public
 *                       bucket and execute on a visitor's page.
 *  - `csvCell`        — lead names come from a public form, and a spreadsheet
 *                       runs a cell that starts with `=` as a formula.
 *
 * Run with `npm test`.
 */

import { safeNextPath } from "@/lib/redirect";
import { resolveEmbed, safeHref } from "@/lib/embeds";
import { safeFrameSrc, safeImageSrc, sanitizeSearchTerm } from "@/lib/security";
import { findLockViolations, preserveLockedBlocks } from "@/lib/locks";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { sniffImage } from "@/lib/images";
import { csvCell } from "@/lib/csv";
import type { Block } from "@/lib/types";

let fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

console.log("\n-- open redirect (safeNextPath) --");
eq("absolute URL rejected", safeNextPath("https://evil.com"), "/dashboard");
eq("protocol-relative rejected", safeNextPath("//evil.com"), "/dashboard");
eq("backslash trick rejected", safeNextPath("/\\evil.com"), "/dashboard");
eq("unlisted path rejected", safeNextPath("/api/admin/accounts"), "/dashboard");
eq("traversal rejected", safeNextPath("/../admin"), "/dashboard");
eq("allowed path kept", safeNextPath("/edit/demo"), "/edit/demo");
eq("query stripped", safeNextPath("/dashboard?x=1"), "/dashboard");

console.log("\n-- iframe/media scheme (resolveEmbed) --");
eq("javascript: blocked", resolveEmbed("javascript:alert(1)"), { kind: "unknown", src: "" });
eq("data: blocked", resolveEmbed("data:text/html,<script>x</script>"), { kind: "unknown", src: "" });
eq("file: blocked", resolveEmbed("file:///etc/passwd"), { kind: "unknown", src: "" });
eq("https youtube ok", resolveEmbed("https://youtu.be/abc123").kind, "iframe");
eq("safeFrameSrc rejects js:", safeFrameSrc("javascript:alert(1)"), null);
eq("safeImageSrc rejects js:", safeImageSrc("javascript:alert(1)"), null);
eq("safeHref rejects js:", safeHref("javascript:alert(1)"), "#");

console.log("\n-- PostgREST search sanitising --");
eq("filter syntax stripped", sanitizeSearchTerm('a,b.c(d)"e'), "a b c d e");
eq("wildcards stripped", sanitizeSearchTerm("%_admin"), "admin");

console.log("\n-- slug normalisation --");
eq("wildcard chars dropped", normalizeSlug("%"), "");
eq("underscore dropped", normalizeSlug("_"), "");
eq("reserved rejected", validateSlug("admin").ok, false);
eq("normal ok", validateSlug("Dana Reyes").ok, true);

console.log("\n-- locked blocks --");
const stored: Block[] = [
  { id: "a", type: "text", content: "legal footer", locked: true },
  { id: "b", type: "text", content: "free" },
];
eq("delete of locked caught",
  findLockViolations(stored, [stored[1]]).map((v) => v.kind), ["deleted"]);
eq("edit of locked caught",
  findLockViolations(stored, [{ ...stored[0], content: "hacked" } as Block, stored[1]]).map((v) => v.kind),
  ["modified"]);
eq("unlocking caught",
  findLockViolations(stored, [{ ...stored[0], locked: false } as Block, stored[1]]).map((v) => v.kind),
  ["lock_changed"]);
eq("hiding a locked block allowed",
  findLockViolations(stored, [{ ...stored[0], hidden: true } as Block, stored[1]]), []);
eq("reordering allowed",
  findLockViolations(stored, [stored[1], stored[0]]), []);
eq("owner cannot add a lock",
  findLockViolations(stored, [stored[0], { ...stored[1], locked: true } as Block]).map((v) => v.kind),
  ["lock_changed"]);
eq("unchanged passes", findLockViolations(stored, stored), []);
// A Map keyed by id keeps the last entry, so a payload carrying both a
// tampered and a pristine copy of a locked block would otherwise pass.
eq("duplicate-id smuggling caught",
  findLockViolations(stored, [
    { ...stored[0], content: "hacked" } as Block,
    stored[0],
    stored[1],
  ]).map((v) => v.kind),
  ["duplicate_id"]);

console.log("\n-- restore cannot drop a lock (preserveLockedBlocks) --");
{
  const current: Block[] = [
    { id: "legal", type: "text", content: "NMLS #123456", locked: true },
    { id: "bio", type: "text", content: "current bio" },
  ];
  // A snapshot from before the block was locked simply has no `legal` block.
  const oldSnapshot: Block[] = [{ id: "bio", type: "text", content: "old bio" }];
  const merged = preserveLockedBlocks(current, oldSnapshot);
  eq("locked block re-appended after restore",
    merged.map((b) => b.id).sort(), ["bio", "legal"]);
  eq("owner's own content still restored",
    (merged.find((b) => b.id === "bio") as { content: string }).content, "old bio");

  // A snapshot containing a tampered copy must not win over the live lock.
  const tampered: Block[] = [
    { id: "legal", type: "text", content: "NMLS #000000", locked: true },
    { id: "bio", type: "text", content: "old bio" },
  ];
  eq("locked content wins over the snapshot",
    (preserveLockedBlocks(current, tampered).find((b) => b.id === "legal") as { content: string })
      .content,
    "NMLS #123456");

  eq("no locks means verbatim restore",
    preserveLockedBlocks([{ id: "bio", type: "text", content: "x" }], oldSnapshot), oldSnapshot);
}


console.log("\n-- uploads are typed by content, not by claim (sniffImage) --");
{
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  eq("jpeg recognised", sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext, "jpg");
  eq("png recognised",
    sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext, "png");
  eq("webp recognised",
    sniffImage(new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00,
    ]))?.ext,
    "webp");

  // The whole point: an SVG is text, so it can never match a binary signature,
  // however it is named or whatever Content-Type the caller announces.
  const svg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  );
  eq("svg rejected", sniffImage(svg), null);

  // An SVG with an XML prolog, and one padded to look like it has a header.
  eq("svg with xml prolog rejected",
    sniffImage(new TextEncoder().encode('<?xml version="1.0"?><svg/>')), null);

  // A RIFF container that is not WebP (a .wav, say) must not pass as an image.
  eq("riff that is not webp rejected",
    sniffImage(new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x00, 0x00, 0x00, 0x00,
    ])),
    null);

  eq("html rejected", sniffImage(new TextEncoder().encode("<html><body>hi")), null);
  eq("empty rejected", sniffImage(new Uint8Array([])), null);
  // Truncated magic must not squeak through on a short buffer.
  eq("truncated png rejected", sniffImage(new Uint8Array([0x89, 0x50, 0x4e])), null);
}

console.log("\n-- exported leads cannot become spreadsheet formulas (csvCell) --");
{
  // Every one of these is a value a stranger can type into a public lead form.
  eq("equals is neutralised", csvCell("=HYPERLINK(\"http://evil\",\"x\")"),
    "\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"");
  eq("plus is neutralised", csvCell("+1+1"), "\"'+1+1\"");
  eq("minus is neutralised", csvCell("-1+1"), "\"'-1+1\"");
  eq("at is neutralised", csvCell("@SUM(A1)"), "\"'@SUM(A1)\"");
  // Spreadsheets strip leading whitespace before deciding, so tab counts too.
  eq("leading tab is neutralised", csvCell("\t=1+1"), "\"'\t=1+1\"");

  // Ordinary values must survive untouched — a guard that mangles real data
  // gets turned off.
  eq("plain name untouched", csvCell("Jordan Avery"), "\"Jordan Avery\"");
  eq("embedded quotes doubled", csvCell('He said "hi"'), '"He said ""hi"""');
  eq("comma stays inside quotes", csvCell("Phoenix, AZ"), "\"Phoenix, AZ\"");
  eq("a minus mid-string is fine", csvCell("480-555-0100"), "\"480-555-0100\"");
  eq("null becomes empty", csvCell(null), "");
  eq("tags array joined", csvCell(["buyer", "scottsdale"]), "\"buyer scottsdale\"");
}

console.log(fail === 0 ? "\nALL GUARD TESTS PASSED" : `\n${fail} GUARD TEST(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
