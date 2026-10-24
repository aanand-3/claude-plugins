/** The way off the Python scripts for projects set up before the Node port: their `.crew/bin/X.py` copies and the
 * `python3 .crew/bin/X.py` lines that call them. setup_git and compose_rules run this after vendoring the `.mjs`.
 *
 * - rewrite: in the files crew owns (its hooks and .claude/settings.json), point the calls at the vendored .mjs;
 * - cleanup: remove a `.py` only once no file, crew's or the project's own, still names it — a commit or a Claude hook
 *   never loses a check halfway, and a reference crew can't rewrite safely keeps its `.py` and is reported instead. */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const LEGACY = ["check_secrets", "check_structure", "check_design", "format_on_edit", "track_plan_draft"];

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
const filesIn = (root: string, dir: string) => {
  const d = join(root, dir);
  return existsSync(d) && statSync(d).isDirectory() ? readdirSync(d).filter((f) => isFile(join(d, f))).map((f) => `${dir}/${f}`) : [];
};

/** Files crew wrote and may rewrite. */
function crewOwned(root: string): string[] {
  return [...filesIn(root, ".githooks"), ".claude/settings.json"].filter((f) => isFile(join(root, f)));
}

/** The project's own files that may call the scripts too: reported, never edited. */
function projectOwned(root: string): string[] {
  const hooksPath = (spawnSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).stdout ?? "").trim();
  const foreign = hooksPath && hooksPath !== ".githooks" ? filesIn(root, hooksPath) : [];
  return [".claude/settings.local.json", ...filesIn(root, ".github/workflows"), ".gitlab-ci.yml", "Makefile",
    ".pre-commit-config.yaml", "package.json", ...filesIn(root, ".husky"), ...foreign].filter((f) => isFile(join(root, f)));
}

/** `python3 … .crew/bin/X.py` → `node … .crew/bin/X.mjs` and `[ -f … .crew/bin/X.py ]` → `.mjs`; any other mention
 * (e.g. `python3 -B …`) is left alone, so it keeps its `.py`. Works in shell hooks and in JSON-escaped commands. */
export function rewriteText(text: string, name: string): string {
  return text
    .replace(new RegExp(`\\bpython3?(\\s+)(\\S*?\\.crew/bin/${name})\\.py\\b`, "g"), "node$1$2.mjs")
    .replace(new RegExp(`(-f\\s+\\S*?\\.crew/bin/${name})\\.py\\b`, "g"), "$1.mjs");
}

/** Upgrade the given scripts in root; returns the lines to print (UPGRADE / REMOVE / KEEP). */
export function upgrade(root: string, names: string[]): string[] {
  const out: string[] = [];
  const bin = join(root, ".crew", "bin");
  for (const file of crewOwned(root)) {
    const before = readFileSync(join(root, file), "utf8");
    let after = before;
    for (const name of names) if (isFile(join(bin, `${name}.mjs`))) after = rewriteText(after, name);
    if (after !== before) {
      writeFileSync(join(root, file), after);
      out.push(`UPGRADE ${file} (runs the vendored .mjs scripts)`);
    }
  }
  const everyFile = [...crewOwned(root), ...projectOwned(root)];
  for (const name of names) {
    const py = join(bin, `${name}.py`);
    if (!isFile(py)) continue;
    const callers = everyFile.filter((f) => readFileSync(join(root, f), "utf8").includes(`${name}.py`));
    if (callers.length) {
      out.push(`KEEP    ${relative(root, py)} — still called from ${callers.join(", ")}; point it at node .crew/bin/${name}.mjs and re-run`);
    } else {
      unlinkSync(py);
      out.push(`REMOVE  ${relative(root, py)} (nothing calls it any more)`);
    }
  }
  return out;
}
