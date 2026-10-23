/** `merge-order`: what Release merges next — done plans whose branches are still unmerged, dependencies first. A plan waits
 * while a plan it depends on isn't merged yet; merged branches are listed for deletion. */
import type { Doc } from "../core/doc.js";
import * as git from "../core/git.js";
import type { Store } from "../core/store.js";
import { byKey } from "../core/text.js";

export interface MergeOrder { base: string; merge: { id: string; title: string; branch: string }[]; waiting: { id: string; why: string }[];
  merged: { id: string; branch: string }[] }

export function mergeOrder(store: Store): MergeOrder {
  const base = store.baseBranch(), plans = store.plans(true), events = store.ledger.events(), moved = store.ledger.lastStatus(events);
  const doneAt = new Map(events.filter((e) => e.type === "move" && e.to === "done").map((e) => [e.ref, e.ts]));
  const branches = new Set(git.planBranches());
  const status = (p: Doc) => moved.get(p.id) ?? p.get("status") ?? "";
  const isMerged = (b: string) => git.git(["merge-base", "--is-ancestor", b, base]) !== null;
  const out: MergeOrder = { base, merge: [], waiting: [], merged: [] };
  const done = [...plans.values()].filter((p) => status(p) === "done" && branches.has(p.get("branch") ?? ""))
    .sort(byKey((p) => [doneAt.get(p.id) ?? p.get("completed") ?? "", p.id])); // first completed, first merged
  const pending = new Set<string>(); // done but not merged yet
  for (const p of done) {
    if (isMerged(p.get("branch")!)) out.merged.push({ id: p.id, branch: p.get("branch")! });
    else pending.add(p.id);
  }
  const unmergedDep = (p: Doc) => p.dependsOn().filter((d) => {
    const dep = plans.get(d), b = dep?.get("branch") ?? "";
    return dep && status(dep) !== "dropped" && (pending.has(d) || (branches.has(b) && !isMerged(b)) || status(dep) !== "done");
  });
  const placed = new Set<string>();
  for (let progress = true; progress;) { // dependencies first: place a plan once everything it depends on is placed or merged
    progress = false;
    for (const p of done.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
      if (unmergedDep(p).every((d) => placed.has(d))) {
        out.merge.push({ id: p.id, title: p.get("title") ?? "", branch: p.get("branch")! });
        placed.add(p.id);
        progress = true;
      }
    }
  }
  for (const p of done.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
    out.waiting.push({ id: p.id, why: `depends on ${unmergedDep(p).filter((d) => !placed.has(d)).join(", ")}, not merged yet` });
  }
  return out;
}

export function mergeOrderCmd(store: Store, json = false): void {
  store.require();
  const m = mergeOrder(store);
  if (json) return store.say(JSON.stringify(m, null, 2));
  if (!m.merge.length && !m.waiting.length) store.say(`Nothing to merge into ${m.base}.`);
  m.merge.forEach((p, i) => store.say(`${String(i + 1).padStart(2)}. ${p.id}: ${p.title} — merge ${p.branch} into ${m.base}`));
  for (const w of m.waiting) store.say(`WAIT ${w.id}: ${w.why}`);
  for (const p of m.merged) store.say(`merged: ${p.id} (${p.branch}) — delete the branch`);
}
