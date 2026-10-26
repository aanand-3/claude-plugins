/** `land [P-###]` (FEAT-037): Release's merge queue. Each accepted plan of `merge-order`, in order, is brought up to the
 * base in its worktree, rebuilt, run through `hub.full_suite`, squashed into its one commit and fast-forwarded onto the
 * base; then its worktree and branch go and the plans that depend on it are updated. A plan that fails a step goes back to
 * its developer (`accepted → in-progress`, the `plan.landed` gate, never forced). `land` never moves a plan to `done`:
 * the PM does, once it has landed. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { secretsIn } from "../../core/memory/knowledge.js";
import { acquireLock, releaseLock } from "../../core/memory/ledger.js";
import { requireBase } from "../../core/work/hubstate.js";
import { type Store, yamlBlock } from "../../core/store.js";
import { fail, HubError } from "../../core/text.js";
import { landedProblems, mergeOrder, refreshBin } from "./release.js";
import { runSuite } from "./suite.js";
import { authorize, log, move } from "./workflow.js";

const ROUNDS = 3, OUTPUT_LINES = 5, OUTPUT_CHARS = 600;

/** A step that failed for the plan: it goes back to the developer with this reason. */
class Bounce extends Error {}
/** A step that failed for another reason (the base kept moving, the main checkout is in the way): the plan stays accepted. */
class Stop extends Error {}

/** The last lines of a command's output, for a one-line note (withheld when it looks like a secret). */
function tail(store: Store, text: string): string {
  const lines = text.trimEnd().split("\n").filter((l) => l.trim()).slice(-OUTPUT_LINES).join(" · ").slice(-OUTPUT_CHARS);
  return secretsIn(lines, store.policy.policy.secrets.patterns).length ? "(output withheld: it looked like it contained a secret)" : lines;
}

/** The squash commit's type: feat for a FEAT, else fix for a BUG, else chore. */
function commitType(plan: Doc): string {
  const items = (plan.get("items") ?? "").toUpperCase();
  return /\bFEAT-/.test(items) ? "feat" : /\bBUG-/.test(items) ? "fix" : "chore";
}

export function land(store: Store, id?: string): number {
  store.require();
  authorize(store, id?.toUpperCase() ?? "The merge queue", "plan.landed", undefined, undefined, `land${id ? ` ${id}` : ""}`);
  if (!store.settings().plan_worktrees) fail("land: needs hub.plan_worktrees (each plan in its own worktree); merge by hand as `merge-order` says.");
  if (spawnSync("git", ["merge-tree", "--write-tree", "HEAD", "HEAD"], { cwd: store.home }).status !== 0) {
    fail("land: needs git 2.38 or later (`git merge-tree --write-tree`).");
  }
  const base = store.baseBranch();
  requireBase(store.home, base);
  const order = mergeOrder(store);
  const queue = id ? [check(store, id.toUpperCase(), order)] : order.merge.filter((p) => !p.legacy).map((p) => p.id);
  if (!queue.length) return (store.say(`Nothing to land on ${base}.`), 0);
  const failed = new Set<string>();
  for (const pid of queue) {
    const plan = store.find(pid);
    const after = plan.dependsOn().filter((d) => failed.has(d));
    if (after.length) {
      store.say(`${pid}: skipped — it depends on ${after.join(", ")}, which did not land`);
      failed.add(pid);
      continue;
    }
    if (!store.planWorktrees().has(pid)) {
      store.say(`${pid}: skipped — no worktree on ${plan.get("branch")}: merge it by hand`);
      failed.add(pid);
      continue;
    }
    try {
      landOne(store, plan, base);
    } catch (e) {
      if (e instanceof Bounce) {
        failed.add(pid);
        if (!bounce(store, plan, e.message)) return 1;
      } else if (e instanceof Stop || e instanceof HubError) {
        store.say(`${pid}: not landed — ${e.message}; it stays accepted with its worktree`);
        return 1;
      } else throw e;
    }
  }
  return failed.size ? 1 : 0;
}

/** `land P-###`: the plan is accepted, first in line (nothing it depends on is unlanded) and has its worktree. */
function check(store: Store, pid: string, order: ReturnType<typeof mergeOrder>): string {
  const plan = store.plans().get(pid) ?? fail(`No plan ${pid}.`);
  const status = plan.get("status");
  const entry = order.merge.find((p) => p.id === pid);
  if (status === "done" && entry) fail(`${pid} was completed before \`accepted\` existed: merge it by hand as \`merge-order\` says.`);
  if (status !== "accepted") fail(`${pid} is '${status}': only an accepted plan lands.`);
  const plans = store.plans();
  const unlanded = plan.dependsOn().filter((d) => {
    const dep = plans.get(d), s = dep?.get("status");
    return dep && s !== "dropped" && !((s === "accepted" || s === "done") && !landedProblems(store, dep).length);
  });
  if (unlanded.length) fail(`${pid} waits: depends on ${unlanded.join(", ")}, not landed yet.`);
  if (!entry) fail(`${pid} is not in \`merge-order\`'s list: nothing of it is left to land.`);
  if (!store.planWorktrees().has(pid)) fail(`${pid} has no worktree on ${plan.get("branch")}: merge it by hand.`);
  return pid;
}

function landOne(store: Store, plan: Doc, base: string): void {
  const pid = plan.id, branch = plan.get("branch")!, wt = store.planWorktrees().get(pid)!;
  const at = (args: string[]) => spawnSync("git", ["-C", wt, ...args], { encoding: "utf8" });
  const generated = () => [...git.generated(wt, git.changed(wt, ["."]))];
  // 2. generated files are Release's: back to the branch's version; code left uncommitted means the plan isn't what was accepted
  const stale = generated().filter((f) => at(["cat-file", "-e", `HEAD:${f}`]).status === 0);
  if (stale.length) at(["checkout", "HEAD", "--", ...stale]);
  const open = git.codeChanges(wt, store.policy.policy.secrets.files);
  if (open.length) throw new Bounce(`uncommitted code after acceptance: ${open.slice(0, 10).join(", ")}`);
  for (let round = 1; ; round++) {
    // 3. the base into the plan branch
    const from = git.git(["rev-parse", base], true)!.trim();
    const m = at(["merge", "--no-edit", "-m", `chore(${pid}): update to ${base}`, from]);
    if (m.status !== 0) {
      const files = (at(["diff", "--name-only", "--diff-filter=U"]).stdout ?? "").split("\n").filter(Boolean);
      at(["merge", "--abort"]);
      throw new Bounce(`merging ${base} conflicts in ${files.join(", ") || tail(store, `${m.stdout}${m.stderr}`)}`);
    }
    // 4. rebuild the generated files (and .crew/bin, when the policy says so), committed on the branch
    const hub = yamlBlock(store.ws.read(join(store.dir, "config.yaml")) ?? "", "hub");
    if (hub.build) {
      const b = spawnSync(hub.build, { shell: true, cwd: wt, encoding: "utf8", maxBuffer: 64 << 20 });
      if (b.status !== 0) throw new Bounce(`hub.build failed (exit ${b.status}): ${tail(store, `${b.stdout}${b.stderr}`)}`);
    }
    const { from: binFrom, files: binFiles } = store.policy.policy.release.refresh_bin;
    if (binFrom && binFiles.length) refreshBin(store, wt, false);
    const rebuilt = [...new Set([...generated(), ...git.codeChanges(wt, store.policy.policy.secrets.files)])];
    if (rebuilt.length) {
      at(["add", "-A", "--", ...rebuilt]);
      const c = at(["commit", "-q", "--only", "-m", `chore(${pid}): rebuild generated files`, "--", ...rebuilt]);
      if (c.status !== 0) throw new Stop(`git refused the rebuild commit: ${tail(store, `${c.stdout}${c.stderr}`)}`);
    }
    // 5. the full suite, in a slot shared by every worktree
    if (hub.full_suite) {
      const s = runSuite(store, { cwd: wt, ref: pid, capture: true });
      if (s.exit !== 0) throw new Bounce(`hub.full_suite failed (exit ${s.exit}): ${tail(store, s.output ?? "")}`);
      // what gets squashed is what the suite tested (BUG-035)
      const tip = at(["rev-parse", branch]).stdout.trim();
      if (tip !== s.sha) {
        throw new Stop(`its branch moved during the full suite (tested ${s.sha?.slice(0, 7) ?? "-"}, now ${tip.slice(0, 7)}); run \`land ${pid}\` again`);
      }
    }
    // 6. the plan's one commit on the base, unless the base gained code meanwhile (then again from step 3)
    const sha = squash(store, plan, base, from);
    if (sha) return landed(store, plan, base, branch, wt, sha);
    if (round === ROUNDS) throw new Stop(`${base} kept moving: ${ROUNDS} rounds of update, rebuild and suite; run \`land ${pid}\` again`);
    store.say(`${pid}: ${base} moved during the checks — updating again`);
  }
}

/** Under the hub-commit lock: the plan's squash commit on top of the base, fast-forwarded in the main checkout. Null when
 * the base gained a commit outside .crew/ since `from`. The user's own uncommitted files there are never staged. */
function squash(store: Store, plan: Doc, base: string, from: string): string | null {
  const common = git.commonDir(store.home)!;
  mkdirSync(join(common, "crew"), { recursive: true });
  const lock = join(common, "crew", "hub-commit.lock"), token = acquireLock(lock);
  try {
    const now = git.git(["rev-parse", base], true)!.trim();
    if (now !== from && (git.git(["diff", "--name-only", from, now, "--", ".", ":(exclude).crew"]) ?? "").trim()) return null;
    const tree = spawnSync("git", ["-C", store.home, "merge-tree", "--write-tree", now, plan.get("branch")!], { encoding: "utf8" });
    if (tree.status !== 0) throw new Bounce(`the squash onto ${base} conflicts: ${tail(store, tree.stdout)}`);
    const subject = `${commitType(plan)}(${plan.id}): ${plan.get("title")}`;
    const sha = git.git(["-C", store.home, "commit-tree", tree.stdout.split("\n")[0].trim(), "-p", now, "-m", subject], true)!.trim();
    const ff = spawnSync("git", ["-C", store.home, "merge", "--ff-only", "-q", sha], { encoding: "utf8" });
    if (ff.status !== 0) throw new Stop(`the fast-forward of ${base} in ${store.home} failed: ${tail(store, `${ff.stdout}${ff.stderr}`)}`);
    return sha;
  } finally {
    releaseLock(lock, token);
  }
}

/** 7–9: log the landing (the squash is on the base: that is the fact), then remove the worktree and the branch and update
 * the dependants' worktrees. Nothing after the log throws: a cleanup that fails is a warning, never "not landed" (BUG-040). */
function landed(store: Store, plan: Doc, base: string, branch: string, wt: string, sha: string): void {
  const short = sha.slice(0, 7);
  log(store, plan.id, `landed on ${base} as ${short}`);
  const warnings = [cleanupWorktree(store, wt)];
  if (git.git(["branch", "-D", branch]) === null) warnings.push(`branch ${branch} was not deleted; delete it by hand`);
  store.forgetWorktrees();
  for (const dep of [...store.plans().values()].filter((p) => p.dependsOn().includes(plan.id))) {
    const home = store.planWorktrees().get(dep.id);
    if (home) store.say(`${dep.id}: ${updateDependant(store, dep, home, base)}`);
  }
  store.say(`${plan.id}: landed on ${base} as ${short} — the PM moves it done`);
  for (const w of warnings) if (w) store.say(`${plan.id}: cleanup — ${w} (the landing stands)`);
}

/** Removes the landed plan's own worktree. When `git worktree remove` fails (Finder writes .DS_Store back while git empties
 * the folder), the folder is deleted only if all that is left is OS junk or empty folders; a warning when it stays. */
function cleanupWorktree(store: Store, wt: string): string | null {
  if (git.git(["worktree", "remove", "--force", wt]) !== null) return null;
  let left: string[] = [];
  try {
    if (existsSync(wt)) left = leftovers(wt, wt);
    if (!left.length) rmSync(wt, { recursive: true, force: true });
  } catch (e) {
    left = [`(${(e as Error).message})`];
  }
  git.git(["worktree", "prune"]);
  if (!left.length) return null;
  return `left ${store.rel(wt) || wt}: ${left.slice(0, 5).join(", ")}${left.length > 5 ? ", …" : ""}; remove it by hand, then \`git worktree prune\``;
}

const OS_JUNK = /^(\.DS_Store|\._.*|Thumbs\.db|desktop\.ini)$/;

/** Every file under `dir` that is not OS junk (nor the worktree's own .git file), relative to `root`; empty folders don't count. */
function leftovers(dir: string, root: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return leftovers(path, root);
    if (OS_JUNK.test(e.name) || (e.isFile() && path === join(root, ".git"))) return [];
    return [relative(root, path)];
  });
}

function updateDependant(store: Store, dep: Doc, home: string, base: string): string {
  const at = (args: string[]) => spawnSync("git", ["-C", home, ...args], { encoding: "utf8" });
  if (at(["merge", "--ff-only", "-q", base]).status === 0) return `worktree fast-forwarded to ${base}`;
  const open = git.codeChanges(home, store.policy.policy.secrets.files);
  if (open.length) return `update ${dep.id} by hand: uncommitted code (${open.slice(0, 5).join(", ")})`;
  const m = at(["merge", "--no-edit", "-q", "-m", `chore(${dep.id}): update to ${base}`, base]);
  if (m.status === 0) return `merged ${base} into its worktree`;
  at(["merge", "--abort"]);
  return `update ${dep.id} by hand: merging ${base} conflicts (${tail(store, `${m.stdout}${m.stderr}`)})`;
}

/** Back to the developer: `accepted → in-progress` through the `plan.landed` gate. A refused move (a blocking question)
 * leaves the plan accepted with its worktree. */
function bounce(store: Store, plan: Doc, why: string): boolean {
  try {
    move(store, plan.id, "in-progress", `land: ${why}`, false, undefined, "plan.landed");
    return true;
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    store.say(`${plan.id}: did not land (${why}), and it can't go back to the developer: ${e.message}`);
    return false;
  }
}
