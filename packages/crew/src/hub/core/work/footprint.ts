/** A plan's footprint (`touches:`): other active plans that overlap it, and changes on its branch that fall outside it. */
import type { Doc } from "./doc.js";
import * as git from "../git.js";
import { globRe, globsOverlap } from "../memory/knowledge.js";
import type { Docs } from "../store.js";

export const LIVE = new Set(["ready", "in-progress", "blocked", "in-review"]);

/** Other ready or active plans whose touches can hit the same files as this plan's, unless one already depends on the other. */
export function overlapping(plan: Doc, plans: Docs): { id: string; globs: string[] }[] {
  const mine = plan.touches();
  return [...plans.values()].filter((p) => p.id !== plan.id && LIVE.has(p.get("status") ?? "")
    && !p.dependsOn().includes(plan.id) && !plan.dependsOn().includes(p.id)).flatMap((p) => {
    const globs = p.touches().filter((g) => mine.some((m) => globsOverlap(m, g)));
    return globs.length ? [{ id: p.id, globs }] : [];
  });
}

/** Files changed on the plan's branch (since it left the base branch, plus uncommitted) that no `touches:` glob covers.
 * Only answerable where the plan's work is (`home`: its worktree, or this checkout on its branch); else null. */
export function drift(plan: Doc, base: string, home: string | null): string[] | null {
  if (!home || !plan.touches().length) return null;
  const at = (args: string[]) => git.git(["-C", home, ...args]);
  const fork = at(["merge-base", base, "HEAD"])?.trim();
  if (!fork) return null;
  const changed = new Set([...(at(["diff", "--name-only", fork])?.split("\n") ?? []),
    ...(at(["ls-files", "--others", "--exclude-standard"])?.split("\n") ?? [])].filter(Boolean));
  const globs = plan.touches().map(globRe);
  return [...changed].filter((f) => !f.startsWith(".crew/") && !globs.some((g) => g.test(f))).sort();
}
