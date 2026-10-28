/** The steps `land` (land.ts) and its batches (batch.ts) share (P-079): bring a plan up to the base, rebuild a checkout,
 * log a landing, send a plan back to its developer. */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { Doc } from "../../core/work/doc.js";
import * as git from "../../core/git.js";
import { secretsIn } from "../../core/memory/knowledge.js";
import { type Store, yamlBlock } from "../../core/store.js";
import { HubError } from "../../core/text.js";
import { copyBin } from "./release.js";
import { log, move } from "./workflow.js";
import { cleanupWorktree } from "./worktree-cleanup.js";

export const ROUNDS = 3;
const OUTPUT_LINES = 5, OUTPUT_CHARS = 600;

/** A step that failed for the plan: it goes back to the developer with this reason. */
export class Bounce extends Error {}
/** A step that failed for another reason (the base kept moving, the main checkout is in the way): the plan stays accepted. */
export class Stop extends Error {}

/** The last lines of a command's output, for a one-line note (withheld when it looks like a secret). */
export function tail(store: Store, text: string): string {
  const lines = text.trimEnd().split("\n").filter((l) => l.trim()).slice(-OUTPUT_LINES).join(" · ").slice(-OUTPUT_CHARS);
  return secretsIn(lines, store.policy.policy.secrets.patterns).length ? "(output withheld: it looked like it contained a secret)" : lines;
}

/** The squash commit's type: feat for a FEAT, else fix for a BUG, else chore. */
export function commitType(plan: Doc): string {
  const items = (plan.get("items") ?? "").toUpperCase();
  return /\bFEAT-/.test(items) ? "feat" : /\bBUG-/.test(items) ? "fix" : "chore";
}

/** The `hub:` block of the main checkout's .crew/config.yaml. */
export function hubSettings(store: Store): Record<string, string> {
  return yamlBlock(store.ws.read(join(store.dir, "config.yaml")) ?? "", "hub");
}

/** Steps 2 and 3 in the plan's worktree: generated files back to the branch's version, uncommitted code bounces, then the
 * base (at `from`, default its tip now) merged into the branch (a conflict bounces). Returns the base sha it merged. */
export function prepare(store: Store, plan: Doc, base: string, from = git.git(["rev-parse", base], true)!.trim()): string {
  const pid = plan.id, wt = store.planWorktrees().get(pid)!;
  const at = (args: string[]) => spawnSync("git", ["-C", wt, ...args], { encoding: "utf8" });
  // 2. generated files are Release's: back to the branch's version; code left uncommitted means the plan isn't what was accepted
  const stale = [...git.generated(wt, git.changed(wt, ["."]))].filter((f) => at(["cat-file", "-e", `HEAD:${f}`]).status === 0);
  if (stale.length) at(["checkout", "HEAD", "--", ...stale]);
  const open = git.codeChanges(wt, store.policy.policy.secrets.files);
  if (open.length) throw new Bounce(`uncommitted code after acceptance: ${open.slice(0, 10).join(", ")}`);
  // 3. the base into the plan branch
  const m = at(["merge", "--no-edit", "-m", `chore(${pid}): update to ${base}`, from]);
  if (m.status !== 0) {
    const files = (at(["diff", "--name-only", "--diff-filter=U"]).stdout ?? "").split("\n").filter(Boolean);
    at(["merge", "--abort"]);
    throw new Bounce(`merging ${base} conflicts in ${files.join(", ") || tail(store, `${m.stdout}${m.stderr}`)}`);
  }
  return from;
}

/** Step 4 in `dir`: `hub.build` (a failure bounces) and .crew/bin when the policy says so. Returns the files it changed
 * (generated files and code), not yet committed. */
export function rebuild(store: Store, dir: string): string[] {
  const hub = hubSettings(store);
  if (hub.build) {
    const b = spawnSync(hub.build, { shell: true, cwd: dir, encoding: "utf8", maxBuffer: 64 << 20 });
    if (b.status !== 0) throw new Bounce(`hub.build failed (exit ${b.status}): ${tail(store, `${b.stdout}${b.stderr}`)}`);
  }
  const { from: binFrom, files: binFiles } = store.policy.policy.release.refresh_bin;
  if (binFrom && binFiles.length) copyBin(store, dir);
  return [...new Set([...git.generated(dir, git.changed(dir, ["."])), ...git.codeChanges(dir, store.policy.policy.secrets.files)])];
}

/** 7–9: log the landing (the squash is on the base: that is the fact), then remove the worktree and the branch and update
 * the dependants' worktrees. Nothing after the log throws: a cleanup that fails is a warning, never "not landed" (BUG-040). */
export function landed(store: Store, plan: Doc, base: string, branch: string, wt: string, sha: string): void {
  const short = sha.slice(0, 7);
  log(store, plan.id, `landed on ${base} as ${short}`);
  const warnings = [cleanupWorktree(store, { pid: plan.id, branch, base, wt })];
  if (git.git(["branch", "-D", branch]) === null) warnings.push(`branch ${branch} was not deleted; delete it by hand`);
  store.forgetWorktrees();
  for (const dep of [...store.plans().values()].filter((p) => p.dependsOn().includes(plan.id))) {
    const home = store.planWorktrees().get(dep.id);
    if (home) store.say(`${dep.id}: ${updateDependant(store, dep, home, base)}`);
  }
  store.say(`${plan.id}: landed on ${base} as ${short} — the PM moves it done`);
  for (const w of warnings) if (w) store.say(`${plan.id}: cleanup — ${w} (the landing stands)`);
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
export function bounce(store: Store, plan: Doc, why: string): boolean {
  try {
    move(store, plan.id, "in-progress", `land: ${why}`, false, undefined, "plan.landed");
    return true;
  } catch (e) {
    if (!(e instanceof HubError)) throw e;
    store.say(`${plan.id}: did not land (${why}), and it can't go back to the developer: ${e.message}`);
    return false;
  }
}
