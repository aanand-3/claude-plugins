/** The hub files plan worktrees hold uncommitted, as the store overlays them on this checkout's: a plan's items, goals,
 * knowledge and the idea's new focus live in its worktree until it completes. */
import { statSync } from "node:fs";
import { join } from "node:path";
import * as git from "../git.js";

export class WorktreeCopies {
  private dirty = new Map<string, string[]>();

  /** `hub`: the hub directory, relative to the repository root (`.crew`). */
  constructor(private readonly root: string, private readonly hub: string) {}

  /** Files were written, or worktrees added or removed: read git again. */
  forget(): void {
    this.dirty.clear();
  }

  /** The worktrees' uncommitted copies of the hub files that match, one per file: the most recently written, whatever the
   * worktree order. This checkout's copy wins where it changed the file too, or committed it after that copy was written
   * (another plan merged). */
  pick(worktrees: Iterable<string>, match: (f: string) => boolean): string[] {
    const mine = new Set(this.dirtyIn(this.root)), newest = new Map<string, { path: string; mtime: number }>();
    for (const wt of worktrees) {
      for (const f of this.dirtyIn(wt).filter((x) => match(x) && !mine.has(x))) {
        const path = join(wt, f), mtime = statSync(path, { throwIfNoEntry: false })?.mtimeMs ?? -1; // -1: gone (or quoted by git)
        if (mtime >= 0 && mtime > (newest.get(f)?.mtime ?? -1) && !this.committedSince(wt, f, mtime)) newest.set(f, { path, mtime });
      }
    }
    return [...newest.values()].map((c) => c.path);
  }

  /** A checkout's uncommitted hub files: one `git status` per checkout until something is written. */
  private dirtyIn(dir: string): string[] {
    let d = this.dirty.get(dir);
    if (!d) this.dirty.set(dir, (d = git.dirty(dir, this.hub)));
    return d;
  }

  /** This checkout committed `f` after a worktree's copy was written (at `mtime`), and differently from what that worktree
   * started from. */
  private committedSince(wt: string, f: string, mtime: number): boolean {
    if (git.show("HEAD", f) === git.git(["-C", wt, "show", `HEAD:${f}`])) return false;
    return Number(git.git(["log", "-1", "--format=%ct", "HEAD", "--", f])?.trim() || 0) * 1000 > mtime;
  }
}
