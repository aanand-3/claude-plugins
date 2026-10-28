/** `merge-order`: what Release lands next — accepted plans whose branches are still unmerged, first accepted first and
 * dependencies first (plus plans completed before `accepted` existed, merged by hand). A plan waits while a plan it depends
 * on isn't landed yet; merged (or squash-merged) branches are listed for deletion. */
import { chmodSync, copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import type { Store } from "../../core/store.js";
import { byKey, fail } from "../../core/text.js";

export interface MergeOrder { base: string;
  merge: { id: string; title: string; branch: string; worktree?: string; legacy?: boolean }[]; waiting: { id: string; why: string }[];
  merged: { id: string; branch: string; legacy?: boolean }[] }

/** A plan branch merged into `base`, or squash-merged (this repo's way: the branch never becomes an ancestor). */
export const branchMerged = (branch: string, base: string, pid: string) =>
  git.git(["merge-base", "--is-ancestor", branch, base]) !== null || git.squashMerge(branch, base, pid) !== null;

/** Why a plan isn't landed on the base yet (`plan.done`'s gate): its plan worktree is still open, or its branch is neither
 * merged nor squash-merged into the base. A plan with neither (no branch, or both removed by `land`) is landed. */
export function landedProblems(store: Store, plan: Doc): string[] {
  const base = store.baseBranch(), b = plan.get("branch") ?? "", how = `Release lands it with \`land ${plan.id}\``;
  const wt = store.settings().plan_worktrees ? store.planWorktrees().get(plan.id) : undefined;
  if (wt) return [`its worktree ${store.rel(wt) || wt} is still open: ${how}`];
  if (b && git.planBranches().includes(b) && !branchMerged(b, base, plan.id)) return [`${b} is not merged into ${base}: ${how}`];
  return [];
}

export function mergeOrder(store: Store): MergeOrder {
  const base = store.baseBranch(), plans = store.plans(true), events = store.ledger.events(), moved = store.ledger.lastStatus(events);
  const at = new Map(events.filter((e) => e.type === "move" && (e.to === "accepted" || e.to === "done")).map((e) => [`${e.ref} ${e.to}`, e.ts]));
  const branches = new Set(git.planBranches());
  const status = (p: Doc) => moved.get(p.id) ?? p.get("status") ?? "";
  const landed = new Map<string, boolean>();
  const isLanded = (p: Doc) => {
    if (!landed.has(p.id)) landed.set(p.id, !landedProblems(store, p).length);
    return landed.get(p.id)!;
  };
  const out: MergeOrder = { base, merge: [], waiting: [], merged: [] };
  const queue = [...plans.values()].filter((p) => ["accepted", "done"].includes(status(p)) && branches.has(p.get("branch") ?? ""))
    .sort(byKey((p) => [at.get(`${p.id} ${status(p)}`) ?? p.get("completed") ?? "", p.id])); // first accepted, first landed
  const pending = new Set<string>(); // accepted (or done) but not landed yet
  for (const p of queue) {
    if (isLanded(p)) out.merged.push({ id: p.id, branch: p.get("branch")!, ...(status(p) === "done" ? { legacy: true } : {}) });
    else pending.add(p.id);
  }
  const unlandedDep = (p: Doc) => p.dependsOn().filter((d) => {
    const dep = plans.get(d), s = dep ? status(dep) : "";
    return dep && s !== "dropped" && !((s === "done" || s === "accepted") && isLanded(dep));
  });
  const worktrees = store.settings().plan_worktrees ? store.planWorktrees() : new Map<string, string>();
  const placed = new Set<string>();
  for (let progress = true; progress;) { // dependencies first: place a plan once everything it depends on is placed or landed
    progress = false;
    for (const p of queue.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
      if (unlandedDep(p).every((d) => placed.has(d))) {
        const wt = worktrees.get(p.id);
        out.merge.push({ id: p.id, title: p.get("title") ?? "", branch: p.get("branch")!, ...(wt ? { worktree: store.rel(wt) } : {}),
          ...(status(p) === "done" ? { legacy: true } : {}) });
        placed.add(p.id);
        progress = true;
      }
    }
  }
  for (const p of queue.filter((x) => pending.has(x.id) && !placed.has(x.id))) {
    out.waiting.push({ id: p.id, why: `depends on ${unlandedDep(p).filter((d) => !placed.has(d)).join(", ")}, not landed yet` });
  }
  return out;
}

export function mergeOrderCmd(store: Store, json = false): void {
  store.require();
  const m = mergeOrder(store);
  if (json) return store.say(JSON.stringify(m, null, 2));
  if (!m.merge.length && !m.waiting.length) store.say(`Nothing to merge into ${m.base}.`);
  m.merge.forEach((p, i) => store.say(`${String(i + 1).padStart(2)}. ${p.id}: ${p.title} — ` + (!p.legacy ? `\`land ${p.id}\``
    : (p.worktree ? `commit everything in ${p.worktree} once (\`<type>(${p.id}): ${p.title}\`), squash-merge ${p.branch} into ${m.base}, `
      + `then \`git worktree remove ${p.worktree}\` and delete the branch` : `merge ${p.branch} into ${m.base}`)
      + " (completed before `accepted`: merge by hand)")));
  for (const w of m.waiting) store.say(`WAIT ${w.id}: ${w.why}`);
  for (const p of m.merged) store.say(`merged: ${p.id} (${p.branch}) — ${p.legacy ? "" : "the PM moves it done; "}delete the branch`);
}

/** `release.refresh_bin` validated against the checkout `root`: its `from` dir and the listed `.crew/bin` files that differ
 * from it (a file missing on either side is said and skipped). A missing or bad key fails. */
function binState(store: Store, root: string): { src: string; stale: string[] } {
  const { from, files } = store.policy.policy.release.refresh_bin;
  if (!from || !files.length) fail("refresh-bin: the policy has no release.refresh_bin (from, files); the executive sets it in .crew/policy.yaml");
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
  return { src, stale };
}

/** Copy the stale `release.refresh_bin.files` from `from` over `<root>/.crew/bin/`, keeping each target's mode; no role or
 * branch check (BUG-059): `land` calls it in the checkout it chose, behind its own `plan.landed` gate. Returns the copied
 * `.crew/bin/<f>` paths. */
export function copyBin(store: Store, root: string, { src, stale } = binState(store, root)): string[] {
  for (const f of stale) {
    const t = join(root, ".crew", "bin", f), mode = statSync(t).mode;
    copyFileSync(join(root, src, f), t);
    chmodSync(t, mode & 0o7777);
    store.say(`refreshed .crew/bin/${f} from ${src}/${f}`);
  }
  if (!stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${src}`);
  return stale.map((f) => `.crew/bin/${f}`);
}

/** `refresh-bin [--check]` (FEAT-027): copy the policy's `release.refresh_bin.files` from `from` over the vendored copies
 * in `<root>/.crew/bin/`, the only way an agent changes `.crew/bin/**`. `root` is the checkout to refresh (a plan's
 * worktree, so the copy rides in the plan's one commit), never `store.dir`. It only replaces files already there.
 * `--check` is read-only (any role, any checkout) and exits 1 when a listed copy differs. */
export function refreshBin(store: Store, root: string, check: boolean): number {
  const { from, files } = store.policy.policy.release.refresh_bin;
  if (check && (!from || !files.length)) return (store.say("refresh-bin: nothing to check (no release.refresh_bin in the policy)"), 0);
  const state = binState(store, root);
  if (check) {
    for (const f of state.stale) store.say(`stale: .crew/bin/${f} differs from ${state.src}/${f} (Release runs \`crew.mjs refresh-bin\`)`);
    if (!state.stale.length) store.say(`refresh-bin: .crew/bin is up to date with ${state.src}`);
    return state.stale.length ? 1 : 0;
  }
  const role = store.ledger.who.role;
  if (role !== "release") fail(`refresh-bin: only the release role refreshes .crew/bin; this run is ${role ? `the ${role} role` : "no role"}`);
  const branch = git.git(["-C", root, "branch", "--show-current"])?.trim() ?? "";
  const plan = [...store.plans().values()].find((p) => branch && p.get("branch") === branch && p.get("status") !== "dropped");
  if (!plan) fail(`refresh-bin: this checkout (branch '${branch || "none"}') is not a plan's worktree; run it in the plan's worktree`);
  copyBin(store, root, state);
  return 0;
}
