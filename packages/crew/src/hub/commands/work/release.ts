/** `merge-order`: what Release merges next — done plans whose branches are still unmerged, dependencies first. A plan waits
 * while a plan it depends on isn't merged yet; merged (or squash-merged) branches are listed for deletion. */
import { chmodSync, copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import type { Store } from "../../core/store.js";
import { byKey, fail } from "../../core/text.js";

export interface MergeOrder { base: string; merge: { id: string; title: string; branch: string; worktree?: string }[]; waiting: { id: string; why: string }[];
  merged: { id: string; branch: string }[] }

export function mergeOrder(store: Store): MergeOrder {
  const base = store.baseBranch(), plans = store.plans(true), events = store.ledger.events(), moved = store.ledger.lastStatus(events);
  const doneAt = new Map(events.filter((e) => e.type === "move" && e.to === "done").map((e) => [e.ref, e.ts]));
  const branches = new Set(git.planBranches());
  const status = (p: Doc) => moved.get(p.id) ?? p.get("status") ?? "";
  // with plan_worktrees, a plan's worktree holds its work uncommitted until Release commits it: its branch then only
  // looks merged. Other worktrees on a plan branch (a developer's own checkout) hold no plan work.
  const worktrees = new Map([...store.settings().plan_worktrees ? store.planWorktrees() : []]
    .filter(([, wt]) => git.dirty(wt, ".").length));
  const merged = new Map<string, boolean>(); // merged in, or squash-merged (this repo's way: the branch never becomes an ancestor)
  const isMerged = (p: Doc) => {
    const b = p.get("branch")!;
    if (!merged.has(p.id)) merged.set(p.id, !worktrees.has(p.id)
      && (git.git(["merge-base", "--is-ancestor", b, base]) !== null || git.squashMerge(b, base, p.id) !== null));
    return merged.get(p.id)!;
  };
  const out: MergeOrder = { base, merge: [], waiting: [], merged: [] };
  const done = [...plans.values()].filter((p) => status(p) === "done" && branches.has(p.get("branch") ?? ""))
    .sort(byKey((p) => [doneAt.get(p.id) ?? p.get("completed") ?? "", p.id])); // first completed, first merged
  const pending = new Set<string>(); // done but not merged yet
  for (const p of done) {
    if (isMerged(p)) out.merged.push({ id: p.id, branch: p.get("branch")! });
    else pending.add(p.id);
  }
  const unmergedDep = (p: Doc) => p.dependsOn().filter((d) => {
    const dep = plans.get(d), b = dep?.get("branch") ?? "";
    return dep && status(dep) !== "dropped" && (pending.has(d) || (branches.has(b) && !isMerged(dep)) || status(dep) !== "done");
  });
  const placed = new Set<string>();
  for (let progress = true; progress;) { // dependencies first: place a plan once everything it depends on is placed or merged
    progress = false;
    for (const p of done.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
      if (unmergedDep(p).every((d) => placed.has(d))) {
        const wt = worktrees.get(p.id);
        out.merge.push({ id: p.id, title: p.get("title") ?? "", branch: p.get("branch")!, ...(wt ? { worktree: store.rel(wt) } : {}) });
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
  m.merge.forEach((p, i) => store.say(`${String(i + 1).padStart(2)}. ${p.id}: ${p.title} — `
    + (p.worktree ? `commit everything in ${p.worktree} once (\`<type>(${p.id}): ${p.title}\`), squash-merge ${p.branch} into ${m.base}, `
      + `then \`git worktree remove ${p.worktree}\` and delete the branch` : `merge ${p.branch} into ${m.base}`)));
  for (const w of m.waiting) store.say(`WAIT ${w.id}: ${w.why}`);
  for (const p of m.merged) store.say(`merged: ${p.id} (${p.branch}) — delete the branch`);
}

/** `refresh-bin [--check]` (FEAT-027): copy the policy's `release.refresh_bin.files` from `from` over the vendored copies
 * in `<root>/.crew/bin/`, the only way an agent changes `.crew/bin/**`. `root` is the checkout to refresh (a plan's
 * worktree, so the copy rides in the plan's one commit), never `store.dir`. It only replaces files already there.
 * `--check` is read-only (any role, any checkout) and exits 1 when a listed copy differs. */
export function refreshBin(store: Store, root: string, check: boolean): number {
  const { from, files } = store.policy.policy.release.refresh_bin;
  if (!from || !files.length) {
    if (check) return (store.say("refresh-bin: nothing to check (no release.refresh_bin in the policy)"), 0);
    fail("refresh-bin: the policy has no release.refresh_bin (from, files); the executive sets it in .crew/policy.yaml");
  }
  const src = normalize(from).replace(/\\/g, "/").replace(/\/+$/, "");
  if (isAbsolute(from) || src === ".." || src.startsWith("../") || src === ".crew" || src.startsWith(".crew/")) {
    fail(`refresh-bin: release.refresh_bin.from '${from}' must be a relative path inside the checkout, not under .crew/`);
  }
  const bad = files.filter((f) => !/^\w[\w.-]*$/.test(f));
  if (bad.length) fail(`refresh-bin: release.refresh_bin.files must be bare file names in .crew/bin: ${bad.join(", ")}`);
  const stale: string[] = [];
  for (const f of files) {
    const s = join(root, src, f), t = join(root, ".crew", "bin", f);
    if (!existsSync(s) || !existsSync(t)) {
      store.say(`skipped .crew/bin/${f}: ${existsSync(t) ? `${src}/${f} does not exist` : "not vendored here (refresh-bin never adds a file)"}`);
    } else if (!readFileSync(s).equals(readFileSync(t))) stale.push(f);
  }
  if (check) {
    for (const f of stale) store.say(`stale: .crew/bin/${f} differs from ${src}/${f} (Release runs \`crew.mjs refresh-bin\`)`);
    if (!stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${src}`);
    return stale.length ? 1 : 0;
  }
  const role = store.ledger.who.role;
  if (role !== "release") fail(`refresh-bin: only the release role refreshes .crew/bin; this run is ${role ? `the ${role} role` : "no role"}`);
  const branch = git.git(["-C", root, "branch", "--show-current"])?.trim() ?? "";
  const plan = [...store.plans().values()].find((p) => branch && p.get("branch") === branch && p.get("status") !== "dropped");
  if (!plan) fail(`refresh-bin: this checkout (branch '${branch || "none"}') is not a plan's worktree; run it in the plan's worktree`);
  for (const f of stale) {
    const t = join(root, ".crew", "bin", f), mode = statSync(t).mode;
    copyFileSync(join(root, src, f), t);
    chmodSync(t, mode & 0o7777);
    store.say(`refreshed .crew/bin/${f} from ${src}/${f}`);
  }
  if (!stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${src}`);
  return 0;
}
