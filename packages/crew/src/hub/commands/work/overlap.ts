/** Overlap candidates for an item at triage (FEAT-049): open items with similar titles and plans in flight whose
 * `touches` cover a path the item names. Computed from the documents alone; the PM decides, nothing changes here. */
import { type Doc } from "../../core/work/doc.js";
import { globsOverlap } from "../../core/memory/knowledge.js";
import { ITEM_CLOSED } from "../../core/work/model.js";
import { type Store } from "../../core/store.js";
import { fail, stripComments } from "../../core/text.js";

/** A title match needs Jaccard at least this high and at least `MIN_SHARED` shared tokens. */
export const SIMILARITY = 0.5;
export const MIN_SHARED = 2;
const MAX_ITEMS = 5;
const STOP = new Set(["the", "and", "for", "with", "from", "into", "when", "does", "not", "bug", "feat", "chore", "spike"]);
const EXT = /\.(ts|tsx|mjs|js|json|md|yaml|yml|css)$/;
const IN_FLIGHT = ["ready", "in-progress", "blocked", "in-review", "accepted"];
const BUILDING = new Set(["in-progress", "in-review", "accepted"]); // its code is being built or landed

/** Lower-cased words of 3 or more characters, minus stop words and item-type words. */
export function titleTokens(title: string): Set<string> {
  return new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)));
}

/** Jaccard of the two titles' tokens, or 0 when they share fewer than `MIN_SHARED` tokens. */
export function titleSimilarity(a: string, b: string): number {
  const [x, y] = [titleTokens(a), titleTokens(b)];
  const shared = [...x].filter((t) => y.has(t)).length;
  return shared < MIN_SHARED ? 0 : shared / (x.size + y.size - shared);
}

/** Paths a text names: words (backticked or bare) that contain a `/` or end in a known extension, trimmed of
 * punctuation and `:line` suffixes. URLs are not paths. */
export function namedPaths(text: string): string[] {
  const out = new Set<string>();
  for (const raw of stripComments(text).replaceAll("`", " ").split(/\s+/)) {
    if (raw.includes("://")) continue;
    const w = raw.replace(/^[("'<[]+/, "").replace(/[.,;:)\]"'>!?]+$/, "").replace(/(:\d+)+$/, "").replace(/^\.\//, "");
    if (w && /[a-z]/i.test(w) && (w.includes("/") || EXT.test(w))) out.add(w);
  }
  return [...out];
}

export interface Overlap {
  id: string;
  paths: string[];
  items: { id: string; title: string; status: string; score: number }[];
  plans: { id: string; title: string; status: string; paths: string[] }[];
  architect: { why: string } | null;
}

export function overlapCandidates(store: Store, item: Doc): Overlap {
  const title = item.get("title") ?? "";
  const items = [...store.items().values()]
    .filter((d) => d.id !== item.id && !ITEM_CLOSED.has(d.get("status") ?? ""))
    .map((d) => ({ id: d.id, title: d.get("title") ?? "", status: d.get("status") ?? "", score: titleSimilarity(title, d.get("title") ?? "") }))
    .filter((c) => c.score >= SIMILARITY)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true }))
    .slice(0, MAX_ITEMS)
    .map((c) => ({ ...c, score: Math.round(c.score * 100) / 100 }));
  const paths = namedPaths(item.text.replace(/^---\n[\s\S]*?\n---\n/, ""));
  const plans = [...store.plans().values()]
    .filter((p) => IN_FLIGHT.includes(p.get("status") ?? ""))
    .map((p) => ({ id: p.id, title: p.get("title") ?? "", status: p.get("status") ?? "",
      paths: paths.filter((f) => p.touches().some((t) => globsOverlap(f, t))) }))
    .filter((p) => p.paths.length);
  const why: string[] = [];
  const building = plans.filter((p) => BUILDING.has(p.status));
  if (building.length) why.push(`${item.id} names paths of ${building.map((p) => `${p.id} (${p.status})`).join(", ")}, whose code is being built or landed`);
  if (plans.length >= 2) why.push(`${item.id}'s paths match ${plans.length} plans in flight (${plans.map((p) => p.id).join(", ")}): unclear which one causes it`);
  return { id: item.id, paths, items, plans, architect: why.length ? { why: why.join("; ") } : null };
}

/** The candidate block; empty when there is no candidate. */
export function overlapLines(o: Overlap): string[] {
  if (!o.items.length && !o.plans.length) return [];
  const lines = [`overlap candidates for ${o.id}:`];
  if (o.items.length) lines.push("  similar items (reject as duplicate if it is one):",
    ...o.items.map((c) => `    ${c.id}: ${c.title} [${c.status}] — similarity ${c.score}`));
  if (o.plans.length) lines.push("  plans in flight (never change their scope):");
  for (const p of o.plans) lines.push(`    ${p.id}: ${p.title} [${p.status}] — ${p.paths.join(", ")}`,
    `      → a dependent plan: \`new-plan "<title>" --items ${o.id} --depends ${p.id}\``,
    `      → or a note on it: \`log ${p.id} "${o.id} overlaps: …"\`, then \`triage ${o.id} --reject duplicate --note "noted on ${p.id}"\` if it adds nothing`);
  if (o.architect) lines.push(`technical question → architect: ${o.architect.why} — \`ask ${o.id} --to architect "${o.architect.why}"\``);
  return lines;
}

/** `overlaps ID [--json]`: the candidates for an item, read-only. */
export function overlaps(store: Store, itemId: string, json = false): void {
  store.require();
  const item = store.find(itemId);
  if (!item.get("type")) fail("overlaps works on FEAT/BUG/CHORE/SPIKE items.");
  const o = overlapCandidates(store, item);
  if (json) return store.say(JSON.stringify(o, null, 2));
  const lines = overlapLines(o);
  for (const line of lines.length ? lines : [`no overlap candidates for ${o.id}`]) store.say(line);
}
