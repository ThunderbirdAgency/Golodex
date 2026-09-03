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
 *
 * Run with `npm test`.
 */

import { safeNextPath } from "@/lib/redirect";
import { resolveEmbed, safeHref } from "@/lib/embeds";
import { safeFrameSrc, safeImageSrc, sanitizeSearchTerm } from "@/lib/security";
import { findLockViolations } from "@/lib/locks";
import { normalizeSlug, validateSlug } from "@/lib/slug";
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

console.log(fail === 0 ? "\nALL GUARD TESTS PASSED" : `\n${fail} GUARD TEST(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
