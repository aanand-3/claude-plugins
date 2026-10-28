/** `land [P-###]` (FEAT-037): Release's merge queue. Each accepted plan of `merge-order`, in order, is brought up to the
 * base in its worktree, rebuilt, run through `hub.full_suite`, squashed into its one commit and fast-forwarded onto the
 * base; then its worktree and branch go and the plans that depend on it are updated. A plan that fails a step goes back to
 * its developer (`accepted → in-progress`, the `plan.landed` gate, never forced). `land` never moves a plan to `done`:
 * the PM does, once it has landed. With two or more plans in the queue, `land` (no ID) lands them in batches with one
 * full-suite run each (batch.ts, P-079). */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { acquireLock, releaseLock } from "../../core/memory/ledger.js";
import { requireBase } from "../../core/work/hubstate.js";
import type { Store } from "../../core/store.js";
import { fail, HubError } from "../../core/text.js";
import { Bounce, bounce, commitType, hubSettings, landed, prepare, rebuild, ROUNDS, Stop, tail } from "./land-steps.js";
import { landBatch } from "./batch.js";
import { landedProblems, mergeOrder } from "./release.js";
import { runSuite } from "./suite.js";
import { authorize } from "./workflow.js";

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
  for (let rest = queue; rest.length;) {
    const batch: Doc[] = [];
    for (const pid of rest) {
      const plan = store.find(pid);
      const after = plan.dependsOn().filter((d) => failed.has(d));
      if (after.length) {
        store.say(`${pid}: skipped — it depends on ${after.join(", ")}, which did not land`);
        failed.add(pid);
      } else if (!store.planWorktrees().has(pid)) {
        store.say(`${pid}: skipped — no worktree on ${plan.get("branch")}: merge it by hand`);
        failed.add(pid);
      } else batch.push(plan);
    }
    rest = [];
    if (batch.length === 1) {
      const [plan] = batch;
      try {
        landOne(store, plan, base);
      } catch (e) {
        if (e instanceof Bounce) {
          failed.add(plan.id);
          if (!bounce(store, plan, e.message)) return 1;
        } else if (e instanceof Stop || e instanceof HubError) {
          store.say(`${plan.id}: not landed — ${e.message}; it stays accepted with its worktree`);
          return 1;
        } else throw e;
      }
    } else if (batch.length) {
      const ids = batch.map((p) => p.id);
      try {
        const out = landBatch(store, batch, base);
        out.failed.forEach((f) => failed.add(f));
        if (out.halt) return 1;
        rest = ids.filter((pid) => out.next.includes(pid));
      } catch (e) {
        if (!(e instanceof Stop || e instanceof HubError)) throw e;
        store.say(`land: the batch ${ids.join("+")} did not land — ${e.message}; its plans stay accepted with their worktrees; run \`land\` again`);
        return 1;
      }
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
  for (let round = 1; ; round++) {
    // 2–3. generated files restored, uncommitted code refused, the base merged into the plan branch
    const from = prepare(store, plan, base);
    // 4. rebuild the generated files (and .crew/bin, when the policy says so), committed on the branch
    const rebuilt = rebuild(store, wt);
    if (rebuilt.length) {
      at(["add", "-A", "--", ...rebuilt]);
      const c = at(["commit", "-q", "--only", "-m", `chore(${pid}): rebuild generated files`, "--", ...rebuilt]);
      if (c.status !== 0) throw new Stop(`git refused the rebuild commit: ${tail(store, `${c.stdout}${c.stderr}`)}`);
    }
    // 5. the full suite, in a slot shared by every worktree
    if (hubSettings(store).full_suite) {
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
