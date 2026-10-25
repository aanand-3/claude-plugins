/** The hub's only access to git. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fail } from "./text.js";

let ROOT: string | null = null;

/** Run every git command against the repository root, so the CLI behaves the same from any subdirectory. */
export function useRoot(root: string): void {
  ROOT = root;
}

export function git(args: string[], check = false): string | null {
  const r = spawnSync("git", ROOT && args[0] !== "-C" ? ["-C", ROOT, ...args] : args, { encoding: "utf8" });
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

/** Every worktree of the repository, with its branch (null when detached). */
export function worktrees(): { path: string; branch: string | null }[] {
  const out: { path: string; branch: string | null }[] = [];
  for (const line of (git(["worktree", "list", "--porcelain"]) ?? "").split("\n")) {
    if (line.startsWith("worktree ")) out.push({ path: line.slice(9), branch: null });
    else if (line.startsWith("branch ") && out.length) out.at(-1)!.branch = line.slice(7).replace(/^refs\/heads\//, "");
  }
  return out;
}

/** Files under `paths` with uncommitted changes in the worktree at `dir` (deletions too), relative to its root. */
export function changed(dir: string, paths: string[]): string[] {
  return (git(["-C", dir, "status", "--porcelain", "-z", "--untracked-files=all", "--no-renames", "--", ...paths]) ?? "")
    .split("\0").filter((l) => l.length > 3).map((l) => l.slice(3));
}

/** Files under `path` with uncommitted changes (added, modified or untracked; not deleted) in the worktree at `dir`,
 * relative to its root. */
export function dirty(dir: string, path: string): string[] {
  return (git(["-C", dir, "status", "--porcelain", "--untracked-files=all", "--no-renames", "--", path]) ?? "")
    .split("\n").filter((l) => l.length > 3 && !l.slice(0, 2).includes("D")).map((l) => l.slice(3));
}

/** The commit on `base` that squash-merged `branch` (plan `pid`), or null: one since the two forked whose subject names the
 * plan (`P-###: …` or `<type>(P-###): …`) and that holds the branch tip's version of every file the branch changed. The
 * subject only narrows the search; a mention-only commit, or a branch that moved on after its squash, doesn't match. */
export function squashMerge(branch: string, base: string, pid: string): string | null {
  const fork = git(["merge-base", branch, base])?.trim();
  const changed = fork ? (git(["diff", "--name-only", "-z", fork, branch]) ?? "").split("\0").filter(Boolean) : [];
  if (!changed.length) return null;
  const names = new RegExp(`^(\\w+\\(${pid}\\)|${pid}):`);
  for (const line of (git(["log", "--format=%H %s", `${fork}..${base}`]) ?? "").split("\n")) {
    const [sha, subject] = [line.slice(0, line.indexOf(" ")), line.slice(line.indexOf(" ") + 1)];
    if (sha && names.test(subject) && git(["--literal-pathspecs", "diff", "--quiet", branch, sha, "--", ...changed]) !== null) return sha;
  }
  return null;
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

/** No uncommitted changes, apart from those under `except` (a path relative to the repository root). */
export function treeIsClean(except?: string): boolean {
  return !(git(["status", "--porcelain", ...(except ? ["--", ".", `:(exclude)${except}`] : [])]) ?? "").trim();
}

function words(out: string | null): string[] {
  return (out ?? "").split(/\s+/).filter(Boolean);
}
