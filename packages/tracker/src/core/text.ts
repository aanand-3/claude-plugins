/** Pure helpers for dates, IDs, slugs, markdown tables and Python-compatible number formatting. */
import { KINDS, type Kind, SECTION_ALIASES, SLUG_STOPWORDS } from "./model.js";

/** A refusal: printed to stderr, exit code 1, and nothing is written. */
export class TrackerError extends Error {}

export function fail(message: string): never {
  throw new TrackerError(message);
}

// ---------------------------------------------------------------- dates (ISO strings, UTC arithmetic)
/** ISO date; TRACKER_TODAY overrides it (tests, back-dated entries). */
export function today(): string {
  if (process.env.TRACKER_TODAY) return process.env.TRACKER_TODAY;
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The ISO date if s is a valid YYYY-MM-DD, else null. */
export function asDate(s: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? s! : null;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// ---------------------------------------------------------------- IDs and names
export function asInt(s: string | null | undefined): number | null {
  const t = (s ?? "").trim();
  return /^[+-]?\d+$/.test(t) ? parseInt(t, 10) : null;
}

export function idList(s: string | null | undefined): string[] {
  return (s ?? "").split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}

export function kindOf(docId: string): Kind | null {
  const m = /^([A-Z]+)-\d+$/.exec(docId.toUpperCase());
  return (m && KINDS[m[1]]) || null;
}

/** Section-name key used to match draft headings to template headings. */
export function norm(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return SECTION_ALIASES[n] ?? n;
}

export function slugify(title: string): string {
  const words = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-").filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if ([...out, w].join("-").length > 40) break;
    out.push(w);
  }
  // cut mid-phrase: drop a dangling "and"; an untruncated title keeps its last word
  while (out.length < words.length && out.length && SLUG_STOPWORDS.has(out[out.length - 1])) out.pop();
  return out.join("-") || "untitled";
}

// ---------------------------------------------------------------- markdown
export function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

/** Rows of the first markdown table in text, keyed by lower-cased header. */
export function mdTable(text: string): Record<string, string>[] {
  const rows = stripComments(text).split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (rows.length < 2) return [];
  const cells = (row: string) => row.replace(/^\|+|\|+$/g, "").split("|").map((c) => c.trim());
  const head = cells(rows[0]).map((h) => h.toLowerCase());
  return rows.slice(2).filter((r) => cells(r).some(Boolean)).map((r) => {
    const c = cells(r);
    const row: Record<string, string> = {};
    head.forEach((h, i) => { if (i < c.length) row[h] = c[i]; });
    return row;
  });
}

/** Python's str.rstrip(). */
export function rstrip(s: string): string {
  return s.replace(/\s+$/, "");
}

// ---------------------------------------------------------------- numbers (Python formatting parity)
/** Python's round(): half to even. */
export function pyRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  return (Math.abs(v % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / f;
}

/** Python's f"{x:.Nf}". */
export function fixed(x: number, digits = 0): string {
  return pyRound(x, digits).toFixed(digits);
}

// ---------------------------------------------------------------- sorting
export type SortKey = (string | number | boolean)[];

/** Compare tuples like Python does (false < true, numbers, then strings). */
export function byKey<T>(key: (t: T) => SortKey): (a: T, b: T) => number {
  return (a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const x = ka[i], y = kb[i];
      if (x === y) continue;
      return x < y ? -1 : 1;
    }
    return ka.length - kb.length;
  };
}
