/** Throwaway git repos for running the plugin's scripts against, like the pytest suite's conftest did.
 * `CREW_TOOLS=py` runs the original Python scripts instead of the ported .mjs, so one test file checks both. */
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const PLUGIN = join(ROOT, "plugins", "crew");
export const SKILLS = join(PLUGIN, "skills");
export const HUB = join(SKILLS, "hub", "dist", "crew.mjs");
export const PY = process.env.CREW_TOOLS === "py";

/** A skill script: the ported .mjs, or the original .py under CREW_TOOLS=py. */
export const script = (skill: string, name: string) => join(SKILLS, skill, "scripts", `${name}.${PY ? "py" : "mjs"}`);

const GIT_ENV = {
  GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: "1",
};

export interface Result { returncode: number; stdout: string; stderr: string }

export class Repo {
  /** The environment every command gets; tests may change it. CREW_* is dropped so a hub run's identity
   * (CREW_ROLE/CREW_RUN, set when the suite runs under `checkpoint --run`) can't leak into the scripts (BUG-004). */
  env: Record<string, string>;

  constructor(readonly path: string) {
    const base = Object.entries(process.env).filter(([k]) => !k.startsWith("CREW_") || k === "CREW_TOOLS");
    this.env = { ...Object.fromEntries(base) as Record<string, string>, ...GIT_ENV };
  }

  /** A new repository on `main` in a temp directory; `git: false` for a plain directory. */
  static create(git = true): Repo {
    const r = new Repo(mkdtempSync(join(tmpdir(), "crew-tools-")));
    if (git) r.git("init", "-q", "-b", "main");
    return r;
  }

  run(cmd: string, args: string[], input?: string): Result {
    const p = spawnSync(cmd, args, { cwd: this.path, env: this.env, input, encoding: "utf8" });
    if (p.error) throw p.error;
    return { returncode: p.status ?? -1, stdout: p.stdout, stderr: p.stderr };
  }

  git(...args: string[]): Result {
    const r = this.run("git", args);
    if (r.returncode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r;
  }

  /** Run a skill script (or the hub bundle) with node or python3, as its extension says. */
  py(path: string, args: string[] = [], input?: string): Result {
    return this.run(path.endsWith(".py") ? "python3" : "node", [path, ...args], input);
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
