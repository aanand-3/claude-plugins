/** A landed plan's worktree cleanup (BUG-040, BUG-041), run by `land` only after the plan's squash is on the base. */
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync, unlinkSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import * as git from "../../core/git.js";
import { globRe } from "../../core/memory/knowledge.js";
import type { Store } from "../../core/store.js";
import { branchMerged } from "./release.js";

export interface Landed { pid: string; branch: string; base: string; wt: string }

/** Removes the landed plan's own worktree: `git worktree remove --force`; while git still lists it as the plan's worktree,
 * up to 3 retries after deleting OS junk (Finder writes .DS_Store back while git empties the folder). Then P-061's
 * junk-only delete, then a full delete when nothing in the folder can be lost (`safeToDelete`). Returns null when the
 * folder is gone, else the warning; never throws. */
export function cleanupWorktree(store: Store, at: Landed): string | null {
  const { wt } = at;
  if (git.git(["worktree", "remove", "--force", wt]) !== null) return null;
  for (let i = 0; i < 3 && registered(at); i++) {
    pause(200);
    try {
      sweepJunk(wt);
    } catch {
      // a junk file that won't go: the removal below says whether it matters
    }
    if (git.git(["worktree", "remove", "--force", wt]) !== null) return null;
  }
  let left: string[] = [];
  try {
    if (existsSync(wt)) left = leftovers(wt, wt);
    if (!left.length) rmSync(wt, { recursive: true, force: true });
  } catch (e) {
    left = [`(${(e as Error).message})`];
  }
  const rel = store.rel(wt) || wt, byHand = "remove it by hand, then `git worktree prune`";
  if (!left.length || !registered(at)) {
    git.git(["worktree", "prune"]);
    return left.length ? `left ${rel}: ${list(left)}; ${byHand}` : null;
  }
  const why = safeToDelete(store, at);
  if (why) return `kept ${rel}: ${why}; ${byHand}`;
  try {
    rmSync(wt, { recursive: true, force: true }); // unlinks symlinks, never follows them
  } catch (e) {
    return `kept what is left of ${rel}: the delete failed (${(e as Error).message}); ${byHand}`;
  }
  git.git(["worktree", "prune"]);
  if (registered(at)) return `deleted ${rel}, but git still lists it as ${at.pid}'s worktree; run \`git worktree prune\``;
  store.say(`${at.pid}: worktree ${rel} deleted after git worktree remove failed (nothing in it could be lost)`);
  return null;
}

/** Ignored paths a build or an install recreates. */
const REGENERABLE = new Set(["node_modules", "dist", "build", "coverage", ".cache", "__pycache__"]);

/** The first reason the stuck worktree must stay (null: nothing in it can be lost); a failed check is a reason. */
function safeToDelete(store: Store, at: Landed): string | null {
  try {
    return whyKeep(store, at);
  } catch (e) {
    return `checking it failed (${(e as Error).message})`;
  }
}

function whyKeep(store: Store, at: Landed): string | null {
  const { pid, branch, base, wt } = at;
  // a. still the plan's registered worktree
  if (!registered(at)) return `git no longer lists it as ${pid}'s worktree`;
  // b. a real folder that holds neither the main checkout nor the repository
  const main = git.worktrees()[0]?.path, common = main ? git.commonDir(main) : null;
  if (!main || !common) return "the main checkout was not found";
  const w = realpathSync(wt), holds = (p: string) => real(p) === w || real(p).startsWith(`${w}${sep}`);
  if (lstatSync(wt).isSymbolicLink() || !lstatSync(wt).isDirectory() || holds(main) || holds(common)) {
    return "it is not a plan worktree folder";
  }
  // c. git answers for the worktree itself, not the main checkout
  const top = git.git(["-C", wt, "rev-parse", "--show-toplevel"])?.trim();
  if (!top || real(top) !== w) return "git does not see it as its own checkout";
  // d. no uncommitted code: only tracked deletions (their content is on the branch) and untracked OS junk
  const secrets = store.policy.policy.secrets.files;
  const status = git.git(["-C", wt, "status", "--porcelain", "-z", "--untracked-files=all"]);
  if (status === null) return "git status failed";
  const dirty = new Set<string>(), deleted = new Set<string>();
  const entries = status.split("\0");
  for (let i = 0; i < entries.length; i++) {
    const [code, path] = [entries[i].slice(0, 2), entries[i].slice(3)];
    if (!path) continue;
    if (/[RC]/.test(code)) i++; // a rename's next entry is its source
    if (/^(D |[ D]D)$/.test(code)) deleted.add(path);
    else if (!(code === "??" && OS_JUNK.test(basename(path)))) dirty.add(path);
  }
  // codeChanges also lists the tracked deletions git made before it stopped, and untracked junk: neither counts
  for (const f of git.codeChanges(wt, secrets)) if (!deleted.has(f) && !OS_JUNK.test(basename(f))) dirty.add(f);
  if (dirty.size) return `uncommitted code (${list([...dirty])})`;
  // e. the branch is on the base
  if (!branchMerged(branch, base, pid)) return `${branch} is not merged into ${base}`;
  // f. every ignored file is regenerable and none may hold secrets
  const out = git.git(["-C", wt, "ls-files", "-z", "--others", "--ignored", "--exclude-standard"]);
  if (out === null) return "listing its ignored files failed";
  const ignored = out.split("\0").filter(Boolean), res = secrets.map(globRe);
  const secret = ignored.filter((f) => res.some((re) => re.test(f)));
  if (secret.length) return `ignored files that may hold secrets (${list(secret)})`;
  const kept = ignored.filter((f) => !OS_JUNK.test(basename(f)) && !f.endsWith(".tsbuildinfo")
    && !f.split("/").some((seg) => REGENERABLE.has(seg)));
  if (kept.length) return `ignored files that are not build output (${list(kept)})`;
  return null;
}

const OS_JUNK = /^(\.DS_Store|\._.*|Thumbs\.db|desktop\.ini)$/;

const list = (paths: string[]) => `${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ", …" : ""}`;
const real = (p: string) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};

/** Whether a fresh `git worktree list` has `wt` (not the main checkout) as a worktree on exactly the plan's branch. */
function registered({ branch, wt }: Landed): boolean {
  const at = real(wt);
  return git.worktrees().slice(1).some((w) => w.branch === branch && real(w.path) === at);
}

/** Deletes OS junk files under `dir`; never descends a symlink. */
function sweepJunk(dir: string): void {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) sweepJunk(path);
    else if (e.isFile() && OS_JUNK.test(e.name)) unlinkSync(path);
  }
}

function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Every file under `dir` that is not OS junk (nor the worktree's own .git file), relative to `root`; empty folders don't count. */
function leftovers(dir: string, root: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return leftovers(path, root);
    if (OS_JUNK.test(e.name) || (e.isFile() && path === join(root, ".git"))) return [];
    return [relative(root, path)];
  });
}
