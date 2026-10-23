/** The file system as commands see it: reads fall through to disk, writes are staged until flush().
 * A command that refuses (HubError) therefore changes nothing. */
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

type Pending = { text: string; mode?: number } | null;

export class Workspace {
  private pending = new Map<string, Pending>();
  private hooks: (() => void)[] = [];
  readonly output: string[] = [];

  constructor(readonly root: string) {}

  /** A line for stdout (shown even when the command later refuses). */
  say(line: string): void {
    this.output.push(line);
  }

  read(path: string): string | null {
    if (this.pending.has(path)) return this.pending.get(path)?.text ?? null;
    return this.isFileOnDisk(path) ? readFileSync(path, "utf8") : null;
  }

  write(path: string, text: string, mode?: number): void {
    this.pending.set(path, { text, mode });
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

  flush(): void {
    for (const hook of this.hooks.splice(0)) hook();
    for (const [path, v] of this.pending) {
      if (v === null) {
        rmSync(path, { force: true, recursive: true });
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, v.text);
      if (v.mode !== undefined) chmodSync(path, v.mode);
    }
    this.pending.clear();
  }

  private isFileOnDisk(path: string): boolean {
    return existsSync(path) && statSync(path).isFile();
  }
}
