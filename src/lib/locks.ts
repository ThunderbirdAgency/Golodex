import type { Block } from "./types";

/**
 * Locked-block enforcement.
 *
 * The point of the product is that someone can be handed a finished page and
 * safely poke at it. That only works if the parts we set up for them cannot be
 * broken by accident — so a block staff marked `locked` is protected here, on
 * the server, where the client cannot reach.
 *
 * A page owner may still reorder a locked block and hide it (those are
 * reversible, visible actions). They may not change its content, delete it, or
 * change its lock state.
 */

export type LockViolation =
  | { kind: "deleted"; id: string }
  | { kind: "modified"; id: string }
  | { kind: "lock_changed"; id: string }
  | { kind: "duplicate_id"; id: string };

/** Stable stringify so key order never registers as a content change. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    // `hidden` is owner-controllable even on a locked block, so it is excluded
    // from the comparison.
    .filter(([k]) => k !== "hidden")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

/**
 * Compare a proposed block list against what is stored.
 * Returns every way the proposal violates a lock; empty means it is allowed.
 */
export function findLockViolations(stored: Block[], proposed: Block[]): LockViolation[] {
  const violations: LockViolation[] = [];

  // Duplicate ids are rejected before anything else, and not merely because
  // they are invalid: a Map keyed by id keeps the LAST entry, so a payload
  // containing both a tampered copy and a pristine copy of a locked block
  // would pass every check below while the page rendered the tampered one.
  const seen = new Set<string>();
  for (const block of proposed) {
    if (seen.has(block.id)) violations.push({ kind: "duplicate_id", id: block.id });
    seen.add(block.id);
  }
  if (violations.length) return violations;

  const proposedById = new Map(proposed.map((b) => [b.id, b]));
  const storedById = new Map(stored.map((b) => [b.id, b]));

  for (const block of stored) {
    if (!block.locked) continue;

    const next = proposedById.get(block.id);
    if (!next) {
      violations.push({ kind: "deleted", id: block.id });
      continue;
    }
    if (!next.locked) {
      violations.push({ kind: "lock_changed", id: block.id });
      continue;
    }
    if (canonical(block) !== canonical(next)) {
      violations.push({ kind: "modified", id: block.id });
    }
  }

  // A page owner must not be able to lock blocks either — that would let them
  // freeze content against staff, and it is not theirs to set.
  for (const block of proposed) {
    if (block.locked && !storedById.get(block.id)?.locked) {
      violations.push({ kind: "lock_changed", id: block.id });
    }
  }

  return violations;
}

export function describeViolations(violations: LockViolation[]): string {
  if (violations.some((v) => v.kind === "duplicate_id")) {
    return "That page has two blocks with the same id, which isn't valid. Reload the builder and try again.";
  }

  const deleted = violations.filter((v) => v.kind === "deleted").length;
  const modified = violations.filter((v) => v.kind === "modified").length;
  const relocked = violations.filter((v) => v.kind === "lock_changed").length;

  const parts: string[] = [];
  if (deleted) parts.push(`${deleted} locked block${deleted > 1 ? "s" : ""} would be removed`);
  if (modified) parts.push(`${modified} locked block${modified > 1 ? "s" : ""} would be changed`);
  if (relocked) parts.push("a block's locked state would change");

  return `Some parts of this page are locked by Golodex: ${parts.join(", ")}. Reordering and hiding are fine — get in touch if you need one changed.`;
}
