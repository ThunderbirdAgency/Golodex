/**
 * CSV encoding for the lead export.
 *
 * The quoting is the boring half. The interesting half is the leading-character
 * guard: a lead's name and message come from a public form on a public page, and
 * Excel, Numbers and Google Sheets all treat a cell beginning `=`, `+`, `-` or
 * `@` as a formula. `=HYPERLINK("http://…"&A1,"click")` in a downloaded file
 * exfiltrates the row it sits in; `=cmd|'/c calc'!A1` is worse. The person who
 * gets hurt is the customer opening their own leads.
 *
 * Tab and carriage return are included because spreadsheet apps strip leading
 * whitespace before deciding whether a cell is a formula, so `\t=HYPERLINK(…)`
 * is a formula too.
 */

/** One CSV field: neutralised, escaped and quoted. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let s = Array.isArray(value) ? value.join(" ") : String(value);

  // An apostrophe makes the cell inert while still displaying the original
  // text, which matters — the customer needs to read what was actually sent.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return `"${s.replace(/"/g, '""')}"`;
}

/** A full CSV document, with a BOM so Excel reads UTF-8 names correctly. */
export function csvDocument(header: readonly string[], rows: unknown[][]): string {
  const lines = rows.map((row) => row.map(csvCell).join(","));
  return `﻿${header.join(",")}\r\n${lines.join("\r\n")}${lines.length ? "\r\n" : ""}`;
}
