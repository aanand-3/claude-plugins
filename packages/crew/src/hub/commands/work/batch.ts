/** `land`'s batches (P-079, FEAT-071): two or more accepted plans are prepared as for a single landing, stacked in merge
 * order on a candidate worktree detached at the base (one squash commit per plan, each rebuilt), and run through
 * `hub.full_suite` once. Green: every plan's commit goes onto the base with one fast-forward. Red: the stacked prefixes
 * are bisected and only the first red plan goes back to its developer; the green prefix lands, the rest wait for the
 * next batch. A plan that conflicts with the plans before it, or whose build fails on top of them, leaves the batch
 * without a bounce. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { acquireLock, releaseLock } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { Bounce, bounce, commitType, hubSettings, landed, prepare, rebuild, ROUNDS, Stop, tail } from "./land-steps.js";
import { runSuite } from "./suite.js";
import { log } from "./workflow.js";

/** What a batch left for `land`: plans for the next batch, plans that went back to their developer, and whether a bounce
 * was refused (then `land` stops). */
export interface BatchOutcome { next: string[]; failed: string[]; halt: boolean }
interface Stacked { plan: Doc; sha: string; tip: string }

const PREFIX = "land-batch-";

export function landBatch(store: Store, queue: Doc[], base: string): BatchOutcome {
  sweep(store);
  const failed: string[] = [];
  let plans = queue;
  for (let round = 1; ; round++) {
    // 2–3. each plan brought up to the same base sha; a failure here is the plan's own
    const from = git.git(["rev-parse", base], true)!.trim(), ready: Doc[] = [];
    for (const plan of plans.filter((p) => !failed.includes(p.id))) {
      try {
        prepare(store, plan, base, from);
        ready.push(plan);
      } catch (e) {
        if (!(e instanceof Bounce)) throw e;
        failed.push(plan.id);
        if (!bounce(store, plan, e.message)) return { next: [], failed, halt: true };
      }
    }
    plans = ready;
    const cand = join(store.home, ".claude", "worktrees", `${PREFIX}${process.pid}`);
    try {
      const out = attempt(store, cand, plans, base, from, failed);
      if (out) return out;
    } finally {
      remove(store, cand);
    }
    if (round === ROUNDS) throw new Stop(`${base} kept moving: ${ROUNDS} rounds of update, stack and suite`);
    store.say(`land: ${base} moved during the batch — updating again`);
  }
}

/** One round on a fresh candidate at `from`: stack, suite (bisect when red), then the chain onto the base. Null when the
 * base gained code meanwhile (the round is redone). */
function attempt(store: Store, cand: string, plans: Doc[], base: string, from: string, failed: string[]): BatchOutcome | null {
  const add = spawnSync("git", ["-C", store.home, "worktree", "add", "-q", "--detach", cand, from], { encoding: "utf8" });
  if (add.status !== 0) throw new Stop(`the candidate worktree could not be added: ${tail(store, add.stderr ?? "")}`);
  const at = (args: string[]) => spawnSync("git", ["-C", cand, ...args], { encoding: "utf8" });
  const hub = hubSettings(store);
  if (hub.setup) {
    const s = spawnSync(hub.setup, { shell: true, cwd: cand, encoding: "utf8", maxBuffer: 64 << 20 });
    if (s.status !== 0) throw new Stop(`hub.setup failed in the candidate (exit ${s.status}): ${tail(store, `${s.stdout}${s.stderr}`)}`);
  }
  // the stack, in merge order; a plan that depends on one that left or bounced leaves with it
  const stacked: Stacked[] = [], gone = new Set(failed), next: string[] = [];
  for (const plan of plans) {
    const after = plan.dependsOn().filter((d) => gone.has(d));
    const why = after.length ? `it depends on ${after.join(", ")}, which is not in the batch` : stack(store, cand, plan, stacked, base);
    if (typeof why !== "string") {
      stacked.push(why);
      continue;
    }
    gone.add(plan.id);
    if (!stacked.length && !after.length) {
      failed.push(plan.id);
      if (!bounce(store, plan, why)) return { next: [], failed, halt: true };
      continue;
    }
    next.push(plan.id);
    log(store, plan.id, `left the land batch: ${why}`);
    store.say(`${plan.id}: left the batch — ${why}; it stays accepted and goes into the next batch`);
  }
  if (!stacked.length) return { next, failed, halt: false };
  // the suite once for the batch; when red, bisect the prefixes: c(lo) green, c(hi) red
  const ids = stacked.map((s) => s.plan.id);
  let lo = 0, hi = stacked.length, red: { exit: number; output?: string } | null = null;
  if (hub.full_suite) {
    const s = runSuite(store, { cwd: cand, ref: ids[0], plans: ids, capture: true });
    if (s.exit !== 0) red = s;
    while (red && hi > lo + 1) {
      const mid = Math.floor((lo + hi) / 2);
      at(["reset", "-q", "--hard", stacked[mid - 1].sha]);
      const r = runSuite(store, { cwd: cand, ref: ids[0], plans: ids.slice(0, mid), capture: true });
      if (r.exit === 0) lo = mid;
      else [hi, red] = [mid, r];
    }
  }
  // what lands is what the suite tested (BUG-035)
  for (const s of stacked) {
    const now = git.git(["rev-parse", s.plan.get("branch")!])?.trim() ?? "";
    if (now !== s.tip) throw new Stop(`${s.plan.id}: its branch moved during the full suite (tested ${s.tip.slice(0, 7)}, now ${now.slice(0, 7) || "-"})`);
  }
  const lands = red ? stacked.slice(0, lo) : stacked;
  const shas = lands.length ? squashChain(store, base, from, lands) : [];
  if (!shas) return null;
  lands.forEach((s, i) => landed(store, s.plan, base, s.plan.get("branch")!, store.planWorktrees().get(s.plan.id)!, shas[i]));
  if (red) {
    const culprit = stacked[hi - 1].plan;
    failed.push(culprit.id);
    const why = `hub.full_suite failed in the batch ${ids.join("+")} (exit ${red.exit}): ${tail(store, red.output ?? "")}`;
    if (!bounce(store, culprit, why)) return { next: [], failed, halt: true };
    next.push(...ids.slice(hi));
  }
  return { next, failed, halt: false };
}

/** The plan's squash commit on top of the stack in the candidate, rebuilt. A conflict outside generated files, or a
 * failed build, resets the candidate and returns why: the plan leaves the batch (or bounces, directly on the base). */
function stack(store: Store, cand: string, plan: Doc, stacked: Stacked[], base: string): Stacked | string {
  const at = (args: string[]) => spawnSync("git", ["-C", cand, ...args], { encoding: "utf8" });
  const head = at(["rev-parse", "HEAD"]).stdout.trim(), tip = git.git(["rev-parse", plan.get("branch")!], true)!.trim();
  const m = at(["merge", "--squash", "--no-commit", tip]);
  if (m.status !== 0) {
    const files = (at(["diff", "--name-only", "--diff-filter=U"]).stdout ?? "").split("\n").filter(Boolean);
    const gen = git.generated(cand, files), code = files.filter((f) => !gen.has(f));
    if (code.length || !files.length) {
      at(["reset", "-q", "--hard", head]);
      const where = code.join(", ") || tail(store, `${m.stdout}${m.stderr}`);
      return stacked.length ? `conflicts with ${stacked.map((s) => s.plan.id).join(", ")} in ${where}` : `merging ${base} conflicts in ${where}`;
    }
    at(["checkout", "--ours", "--", ...files]);
    at(["add", "--", ...files]);
  }
  let rebuilt: string[];
  try {
    rebuilt = rebuild(store, cand);
  } catch (e) {
    if (!(e instanceof Bounce)) throw e;
    at(["reset", "-q", "--hard", head]);
    return stacked.length ? `${e.message} on top of ${stacked.map((s) => s.plan.id).join(", ")}` : e.message;
  }
  if (rebuilt.length) at(["add", "-A", "--", ...rebuilt]);
  const c = at(["commit", "-q", "--allow-empty", "-m", `${commitType(plan)}(${plan.id}): ${plan.get("title")}`]);
  if (c.status !== 0) throw new Stop(`git refused ${plan.id}'s commit in the candidate: ${tail(store, `${c.stdout}${c.stderr}`)}`);
  return { plan, sha: at(["rev-parse", "HEAD"]).stdout.trim(), tip };
}

/** Under the hub-commit lock: one commit per plan on the base, each carrying the base's .crew/ commits and the stack up
 * to it, fast-forwarded in the main checkout. Null when the base gained a commit outside .crew/ since `from`. */
function squashChain(store: Store, base: string, from: string, chain: Stacked[]): string[] | null {
  const common = git.commonDir(store.home)!;
  mkdirSync(join(common, "crew"), { recursive: true });
  const lock = join(common, "crew", "hub-commit.lock"), token = acquireLock(lock);
  try {
    const now = git.git(["rev-parse", base], true)!.trim();
    if (now !== from && (git.git(["diff", "--name-only", from, now, "--", ".", ":(exclude).crew"]) ?? "").trim()) return null;
    const shas: string[] = [];
    let prev = now;
    for (const { plan, sha } of chain) {
      const tree = spawnSync("git", ["-C", store.home, "merge-tree", "--write-tree", now, sha], { encoding: "utf8" });
      if (tree.status !== 0) throw new Stop(`${plan.id}'s commit conflicts with ${base}'s .crew/ commits: ${tail(store, tree.stdout)}`);
      const subject = `${commitType(plan)}(${plan.id}): ${plan.get("title")}`;
      prev = git.git(["-C", store.home, "commit-tree", tree.stdout.split("\n")[0].trim(), "-p", prev, "-m", subject], true)!.trim();
      shas.push(prev);
    }
    const ff = spawnSync("git", ["-C", store.home, "merge", "--ff-only", "-q", prev], { encoding: "utf8" });
    if (ff.status !== 0) throw new Stop(`the fast-forward of ${base} in ${store.home} failed: ${tail(store, `${ff.stdout}${ff.stderr}`)}`);
    return shas;
  } finally {
    releaseLock(lock, token);
  }
}

/** The candidate goes after every round, whatever happened in it. */
function remove(store: Store, cand: string): void {
  git.git(["-C", store.home, "worktree", "remove", "--force", cand]);
  if (existsSync(cand)) rmSync(cand, { recursive: true, force: true });
  git.git(["-C", store.home, "worktree", "prune"]);
}

/** A candidate left by a `land` that died (its pid is gone) is removed. */
function sweep(store: Store): void {
  const dir = join(store.home, ".claude", "worktrees");
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const pid = name.startsWith(PREFIX) ? Number(name.slice(PREFIX.length)) : NaN;
    if (!Number.isInteger(pid) || pid === process.pid || alive(pid)) continue;
    remove(store, join(dir, name));
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
