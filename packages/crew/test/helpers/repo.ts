/** Throwaway git repos to run the plugin's scripts and the hub bundle against. */
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const PLUGIN = join(ROOT, "plugins", "crew");
export const SKILLS = join(PLUGIN, "skills");
export const HUB = join(SKILLS, "hub", "dist", "crew.mjs");

/** A skill script's bundle. */
export const script = (skill: string, name: string) => join(SKILLS, skill, "scripts", `${name}.mjs`);

const GIT_ENV = {
  GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: "1",
};

/** Temp dirs this helper made: "test" ones are removed after each test, "file" ones after the file
 * (test/setup/cleanup.ts), each with its `<path>-*` siblings (BUG-025). */
export const made: { path: string; scope: "test" | "file" }[] = [];

/** A temp dir under os.tmpdir() that lives until the test file ends. */
export function tempDir(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  made.push({ path, scope: "file" });
  return path;
}

export interface Result { returncode: number; stdout: string; stderr: string }

export class Repo {
  /** The environment every command gets; tests may change it. CREW_* is dropped so a hub run's identity
   * (CREW_ROLE/CREW_RUN, set when the suite runs under `checkpoint --run`) can't leak into the scripts (BUG-004). */
  env: Record<string, string>;

  constructor(readonly path: string) {
    const base = Object.entries(process.env).filter(([k]) => !k.startsWith("CREW_"));
    this.env = { ...Object.fromEntries(base) as Record<string, string>, ...GIT_ENV };
  }

  /** A new repository on `main` in a temp directory; `git: false` for a plain directory. */
  static create(git = true): Repo {
    const r = new Repo(mkdtempSync(join(tmpdir(), "crew-tools-")));
    made.push({ path: r.path, scope: "test" });
    if (git) r.git("init", "-q", "-b", "main");
    return r;
  }

  /** Run a command; a process still running after a minute is killed and fails the test, so a hang can't block a worker. */
  run(cmd: string, args: string[], input?: string): Result {
    const p = spawnSync(cmd, args, { cwd: this.path, env: this.env, input, encoding: "utf8", timeout: 60_000 });
    if (p.error) throw p.error;
    return { returncode: p.status ?? -1, stdout: p.stdout, stderr: p.stderr };
  }

  git(...args: string[]): Result {
    const r = this.run("git", args);
    if (r.returncode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r;
  }

  /** Run a skill script or the hub bundle with node. */
  node(path: string, args: string[] = [], input?: string): Result {
    return this.run("node", [path, ...args], input);
  }

  write(rel: string, text = "", mode?: number): string {
    const p = join(this.path, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
    if (mode !== undefined) chmodSync(p, mode);
    return p;
  }

  read(rel: string): string {
    return readFileSync(join(this.path, rel), "utf8");
  }

  commit(msg: string, ...paths: string[]): Result {
    this.git("add", ...(paths.length ? paths : ["-A"]));
    return this.run("git", ["commit", "-q", "-m", msg]);
  }
}
