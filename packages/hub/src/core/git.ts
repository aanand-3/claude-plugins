/** The hub's only access to git. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fail } from "./text.js";

export function git(args: string[], check = false): string | null {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    if (check) fail(`git ${args.join(" ")} failed: ${(r.stderr ?? "").trim()}`);
    return null;
  }
  return r.stdout;
}

export function repoRoot(): string {
  return git(["rev-parse", "--show-toplevel"])?.trim() || process.cwd();
}

/** The directory every worktree of this repository shares (where the ledger lives), or null outside git. */
export function commonDir(root: string): string | null {
  const out = git(["-C", root, "rev-parse", "--git-common-dir"])?.trim();
  return out ? resolve(root, out) : null;
}

/** The author name git would commit with (GIT_AUTHOR_NAME or user.name). */
export function userName(): string | null {
  return /^(.*?) </.exec(git(["var", "GIT_AUTHOR_IDENT"]) ?? "")?.[1].trim() || null;
}

/** Paths git tracks (and untracked, not ignored ones), repository-relative. */
export function files(root: string): string[] {
  return words(git(["-C", root, "ls-files", "--cached", "--others", "--exclude-standard"]));
}

export function currentBranch(): string | null {
  return git(["branch", "--show-current"])?.trim() || null;
}

export function planBranches(): string[] {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/plan/", "refs/remotes/origin/plan/"]));
}

export function allRefs(): string[] {
  return words(git(["for-each-ref", "--format=%(refname:short)", "refs/heads/", "refs/remotes/"]));
}

export function lsTree(ref: string, path: string): string[] {
  return words(git(["ls-tree", "--name-only", ref, path]));
}

export function show(ref: string, path: string): string | null {
  return git(["show", `${ref}:${path}`]);
}

export function treeIsClean(): boolean {
  return !(git(["status", "--porcelain"]) ?? "").trim();
}

function words(out: string | null): string[] {
  return (out ?? "").split(/\s+/).filter(Boolean);
}
