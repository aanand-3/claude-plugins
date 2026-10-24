/** The file system as commands see it: reads fall through to disk, writes are staged until flush().
 * A command that refuses (HubError) therefore changes nothing. */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

type Pending = { text: string; mode?: number } | { from: string } | null;

export class Workspace {
  private pending = new Map<string, Pending>();
  private hooks: (() => void)[] = [];
  private aborts: (() => void)[] = [];
  readonly output: string[] = [];

  constructor(readonly root: string) {}

  /** A line for stdout (shown even when the command later refuses). */
  say(line: string): void {
    this.output.push(line);
  }

  read(path: string): string | null {
    if (this.pending.has(path)) {
      const p = this.pending.get(path);
      return p === null || p === undefined ? null : "from" in p ? readFileSync(p.from, "utf8") : p.text;
    }
    return this.isFileOnDisk(path) ? readFileSync(path, "utf8") : null;
  }

  write(path: string, text: string, mode?: number): void {
    this.pending.set(path, { text, mode });
  }

  /** Stage a byte-for-byte copy (binary files must not go through a string). */
  copy(from: string, to: string): void {
    this.pending.set(to, { from });
  }

  remove(path: string): void {
    this.pending.set(path, null);
  }

  isFile(path: string): boolean {
    return this.pending.has(path) ? this.pending.get(path) !== null : this.isFileOnDisk(path);
  }

  isDir(path: string): boolean {
    if (existsSync(path) && statSync(path).isDirectory()) return true;
    return [...this.pending].some(([p, v]) => v !== null && p.startsWith(path + sep));
  }

  /** File names directly inside dir (staged files included, staged removals excluded), sorted. */
  list(dir: string): string[] {
    const names = new Set(existsSync(dir) && statSync(dir).isDirectory()
      ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : []);
    for (const [p, v] of this.pending) {
      if (dirname(p) !== dir) continue;
      const name = p.slice(dir.length + 1);
      if (v === null) names.delete(name); else names.add(name);
    }
    return [...names].sort();
  }

  rel(path: string): string {
    return relative(this.root, path).split(sep).join("/");
  }

  join(...parts: string[]): string {
    return join(...parts);
  }

  /** Run fn at the start of flush(), before any file is written; a HubError there aborts the whole flush. */
  beforeFlush(fn: () => void): void {
    this.hooks.push(fn);
  }

  /** Undo a side effect that isn't staged (a git branch) if the command is refused after making it. */
  onAbort(fn: () => void): void {
    this.aborts.push(fn);
  }

  /** The command was refused: drop the staged writes and undo unstaged side effects, newest first. */
  abort(): void {
    this.pending.clear();
    this.hooks = [];
    for (const fn of this.aborts.splice(0).reverse()) fn();
  }

  flush(): void {
    try {
      for (const hook of this.hooks.splice(0)) hook();
    } catch (e) {
      this.abort();
      throw e;
    }
    this.aborts = [];
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      if ("from" in v) {
        copyFileSync(v.from, path);
        continue;
      }
      writeFileSync(path, v.text);
      if (v.mode !== undefined) chmodSync(path, v.mode);
    }
    this.pending.clear();
  }

  private isFileOnDisk(path: string): boolean {
    return existsSync(path) && statSync(path).isFile();
  }
}
