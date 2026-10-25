/** A plan's footprint (`touches:`): other active plans that overlap it, and changes on its branch that fall outside it. */
import { join } from "node:path";
import { parse } from "yaml";
import type { Doc } from "./doc.js";
import * as git from "../git.js";
import { globRe, globsOverlap } from "../memory/knowledge.js";
import type { Docs, Store } from "../store.js";

export const LIVE = new Set(["ready", "in-progress", "blocked", "in-review"]);
/** A wildcard touch matching more tracked files than this is broad: list the exact files. */
const BROAD = 10;

/** `hub.shared` in .crew/config.yaml as written (store.ts's flat settings can't hold a list). */
function sharedSetting(store: Store): unknown {
  try {
    return (parse(store.ws.read(join(store.dir, "config.yaml")) ?? "") as { hub?: { shared?: unknown } } | null)?.hub?.shared;
  } catch {
    return undefined;
  }
}

/** `hub.shared`: path globs whose overlaps never block (the merge queue resolves them); [] unless it is a list of strings. */
export function sharedGlobs(store: Store): string[] {
  const v = sharedSetting(store);
  return globList(v) ? v : [];
}

const globList = (v: unknown): v is string[] => Array.isArray(v) && v.every((g) => typeof g === "string");

/** `check`'s error for a `hub.shared` that isn't a list of path globs, else null. */
export function sharedProblem(store: Store): string | null {
  const v = sharedSetting(store);
  return v === undefined || v === null || globList(v) ? null : "hub.shared: expected a list of path globs";
}

/** A touch is shared when it is an exact path a shared glob matches, or is itself a shared glob; a broad glob never is. */
export function isShared(touch: string, shared: string[]): boolean {
  return shared.includes(touch) || (!/[*?]/.test(touch) && shared.some((s) => globRe(s).test(touch)));
}

/** The touches of `b` that overlap a touch of `a` where the pair isn't both shared. */
export function blockingGlobs(a: Doc, b: Doc, shared: string[] = []): string[] {
  const mine = a.touches();
  return b.touches().filter((g) => mine.some((m) => globsOverlap(m, g) && !(isShared(m, shared) && isShared(g, shared))));
}

/** Other ready or active plans whose touches can hit the same files as this plan's, unless one already depends on the other
 * or they meet only on shared touches. */
export function overlapping(plan: Doc, plans: Docs, shared: string[] = []): { id: string; globs: string[] }[] {
  return [...plans.values()].filter((p) => p.id !== plan.id && LIVE.has(p.get("status") ?? "")
    && !p.dependsOn().includes(plan.id) && !plan.dependsOn().includes(p.id)).flatMap((p) => {
    const globs = blockingGlobs(plan, p, shared);
    return globs.length ? [{ id: p.id, globs }] : [];
  });
}

/** The home's tracked files, and those `.gitattributes` marks `linguist-generated`: what `touchHints` matches against. */
export function trackedFiles(home: string): { files: string[]; generated: Set<string> } {
  const ls = (...spec: string[]) => (git.git(["-C", home, "ls-files", "--", ...spec]) ?? "").split("\n").filter(Boolean);
  return { files: ls(), generated: new Set(ls(":(attr:linguist-generated)", ":(attr:linguist-generated=true)")) };
}

/** `check`'s advice on a plan's touches: wildcard globs that are broad (FEAT-028), and paths Release generates. */
export function touchHints(plan: Doc, tracked: { files: string[]; generated: Set<string> }, shared: string[]): string[] {
  const out: string[] = [];
  for (const t of plan.touches()) {
    const re = globRe(t), hits = tracked.files.filter((f) => re.test(f));
    if (/[*?]/.test(t) && (hits.length > BROAD || hits.some((f) => shared.some((s) => globRe(s).test(f))))) {
      out.push(`${plan.id}: touches glob ${t} is broad (${hits.length} tracked files) — list the exact files it changes`);
    }
    const gen = hits.find((f) => tracked.generated.has(f));
    if (gen) out.push(`${plan.id}: touches ${t} lists a generated path (${gen}) — Release rebuilds those (hub.build); no plan lists them`);
  }
  return out;
}

/** Files changed on the plan's branch (since it left the base branch, plus uncommitted) that no `touches:` glob covers.
 * Files `.gitattributes` marks `linguist-generated` are no plan's footprint (Release rebuilds them) and are left out.
 * Only answerable where the plan's work is (`home`: its worktree, or this checkout on its branch); else null. */
export function drift(plan: Doc, base: string, home: string | null): string[] | null {
  if (!home || !plan.touches().length) return null;
  const at = (args: string[]) => git.git(["-C", home, ...args]);
  const fork = at(["merge-base", base, "HEAD"])?.trim();
  if (!fork) return null;
  const changed = new Set([...(at(["diff", "--name-only", fork])?.split("\n") ?? []),
    ...(at(["ls-files", "--others", "--exclude-standard"])?.split("\n") ?? [])].filter(Boolean));
  const globs = plan.touches().map(globRe);
  const outside = [...changed].filter((f) => !f.startsWith(".crew/") && !globs.some((g) => g.test(f)));
  const generated = new Set<string>();
  if (outside.length) { // `check-attr -z` prints path NUL attribute NUL value NUL per file
    const out = (at(["check-attr", "-z", "linguist-generated", "--", ...outside]) ?? "").split("\0");
    for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] === "true" || out[i + 2] === "set") generated.add(out[i]);
  }
  return outside.filter((f) => !generated.has(f)).sort();
}
