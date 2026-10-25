/** Hub documents have one home, the main checkout: every checkout reads and writes them there, and with plan worktrees
 * each command that changes them commits them on the base branch, so parallel plans never fork the state (BUG-018). */
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import * as git from "../git.js";
import { acquireLock, releaseLock } from "../memory/ledger.js";
import { fail } from "../text.js";

/** The hub documents, relative to the home — state, as opposed to setup (config, policy, templates, the vendored hub). */
export const STATE_PATHS = [".crew/plans", ".crew/items", ".crew/goals", ".crew/knowledge", ".crew/idea.md"];
export const STATE_RE = /^\.crew\/((plans|items|goals|knowledge)\/|idea\.md$)/;

const real = (p: string) => (existsSync(p) ? realpathSync(p) : p);

/** The hub's home: the repository's first worktree (the main checkout), or `root` itself when it is that one, or outside
 * git. */
export function hubHome(root: string): string {
  const main = git.worktrees()[0]?.path;
  return !main || real(main) === real(root) ? root : main;
}

/** Refuse before writing when the home isn't on the base branch: state committed anywhere else would fork again. */
export function requireBase(home: string, base: string): void {
  const at = git.git(["-C", home, "branch", "--show-current"])?.trim();
  if (at !== base) {
    fail(`Hub state lives on ${base} in the main checkout (${home}), which is on ${at || "a detached HEAD"}: `
      + `switch it back to ${base}, or turn hub.plan_worktrees off.`);
  }
}

/** Commit the hub documents changed in the home — by this command, or by hand since the last hub commit (they are state
 * too) — and nothing else, one command at a time. Returns the commit, or null when nothing changed. */
export function commitState(home: string, message: string): string | null {
  const common = git.commonDir(home);
  if (!common) return null;
  mkdirSync(join(common, "crew"), { recursive: true });
  const lock = join(common, "crew", "hub-commit.lock"), token = acquireLock(lock);
  try {
    const changed = git.changed(home, STATE_PATHS);
    if (!changed.length) return null;
    git.git(["-C", home, "add", "-A", "--", ...changed], true);
    const r = git.git(["-C", home, "commit", "-q", "--only", "-m", message, "--", ...changed]);
    if (r === null) fail(`The hub's files are written but not committed (git commit failed in ${home}); the next hub command commits them.`);
    return git.git(["-C", home, "rev-parse", "--short", "HEAD"])?.trim() ?? null;
  } finally {
    releaseLock(lock, token);
  }
}
