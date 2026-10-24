/** The way off the Python scripts for projects set up before the Node port: their `.crew/bin/X.py` copies and the
 * `python3 .crew/bin/X.py` lines that call them. setup_git and compose_rules run this after vendoring the `.mjs`.
 *
 * - rewrite: in the files crew owns (its hooks and .claude/settings.json), point the calls at the vendored .mjs;
 * - cleanup: remove a `.py` only once nothing still names it — no tracked file (docs aside), no active git hook, no local
 *   settings — so a commit or a Claude hook never loses a check halfway; a caller crew can't rewrite safely keeps its
 *   `.py` and is reported instead. */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const LEGACY = ["check_secrets", "check_structure", "check_design", "format_on_edit", "track_plan_draft"];

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
const git = (root: string, ...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
/** Files directly in dir (absolute), git's .sample hooks aside. */
const filesIn = (dir: string) => (existsSync(dir) && statSync(dir).isDirectory()
  ? readdirSync(dir).filter((f) => !f.endsWith(".sample") && isFile(join(dir, f))).map((f) => join(dir, f)) : []);

/** Files crew wrote and may rewrite (absolute). */
const crewOwned = (root: string) => [...filesIn(join(root, ".githooks")), join(root, ".claude", "settings.json")].filter(isFile);

/** Where the project may still call the scripts, and crew never edits (absolute): every tracked file but docs and crew's
 * own planning, the usual CI and build files even when untracked, the hooks git actually runs (.git/hooks, a
 * core.hooksPath anywhere) and the untracked local settings. */
function projectOwned(root: string, name: string): string[] {
  const out = new Set<string>();
  const grep = git(root, "grep", "-l", "-F", "-e", `${name}.py`, "--", ".", ":!*.md", ":!.crew/**", ":!docs/**");
  for (const f of (grep.stdout ?? "").split("\n").filter(Boolean)) out.add(resolve(root, f));
  // the usual places too, tracked or not (an uncommitted Makefile, a project that isn't a repository yet)
  for (const f of [...filesIn(join(root, ".github", "workflows")), ...filesIn(join(root, ".husky")),
    ...[".gitlab-ci.yml", "Makefile", ".pre-commit-config.yaml", "package.json"].map((f) => join(root, f))]) out.add(f);
  const hooksDir = (git(root, "rev-parse", "--git-path", "hooks").stdout ?? "").trim();
  const hooksPath = (git(root, "config", "core.hooksPath").stdout ?? "").trim();
  for (const dir of [hooksDir, hooksPath].filter(Boolean)) for (const f of filesIn(resolve(root, dir))) out.add(f);
  out.add(join(root, ".claude", "settings.local.json"));
  return [...out].filter(isFile);
}

/** `python3 … .crew/bin/X.py` → `node … .crew/bin/X.mjs` and `[ -f … .crew/bin/X.py ]` → `.mjs`. Anything else that names
 * the script — a path-qualified interpreter (.venv/bin/python), `python3 -B`, `rm -f`, `X.py.bak` — is left alone, so it
 * keeps its `.py`. Works in shell hooks and in JSON-escaped commands. */
export function rewriteText(text: string, name: string): string {
  const py = `\\.crew/bin/${name})\\.py(?![\\w.])`;
  return text
    .replace(new RegExp(`(?<![\\w./-])python3?(\\s+)(\\S*?${py}`, "g"), "node$1$2.mjs")
    .replace(new RegExp(`(\\[\\s+-f\\s+\\S*?${py}`, "g"), "$1.mjs");
}

/** Upgrade the given scripts in root; returns the lines to print (UPGRADE / REMOVE / KEEP). */
export function upgrade(root: string, names: string[]): string[] {
  const out: string[] = [];
  const bin = join(root, ".crew", "bin");
  // move a call once its .mjs is vendored, or when neither file is there (a guarded line that runs nothing either way)
  const movable = names.filter((n) => isFile(join(bin, `${n}.mjs`)) || !isFile(join(bin, `${n}.py`)));
  for (const file of crewOwned(root)) {
    const before = readFileSync(file, "utf8");
    const after = movable.reduce((t, n) => rewriteText(t, n), before);
    if (after !== before) {
      writeFileSync(file, after);
      out.push(`UPGRADE ${relative(root, file)} (runs the vendored .mjs scripts)`);
    }
  }
  for (const name of names) {
    const py = join(bin, `${name}.py`);
    if (!isFile(py)) continue;
    const callers = [...new Set([...crewOwned(root), ...projectOwned(root, name)])]
      .filter((f) => readFileSync(f, "utf8").includes(`${name}.py`)).map((f) => relative(root, f));
    if (callers.length) {
      out.push(`KEEP    ${relative(root, py)} — still called from ${callers.join(", ")}; point it at node .crew/bin/${name}.mjs and re-run`);
    } else {
      unlinkSync(py);
      out.push(`REMOVE  ${relative(root, py)} (nothing calls it any more)`);
    }
  }
  return out;
}
