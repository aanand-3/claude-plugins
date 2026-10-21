/** The tracker's only access to git. */
import { spawnSync } from "node:child_process";
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
