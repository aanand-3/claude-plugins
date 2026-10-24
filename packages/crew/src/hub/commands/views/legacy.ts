/** `check` hints for what a project set up before crew went Node-only still carries: the vendored `.crew/bin/*.py`
 * scripts, files that still run them, and a `modules:` block from when parts of crew were optional.
 * The same five names as the skill scripts' tools/legacy.ts, which the hub can't import. */
import { isAbsolute, join, relative } from "node:path";
import * as git from "../../core/git.js";
import type { Store } from "../../core/store.js";

const LEGACY = ["check_secrets", "check_structure", "check_design", "format_on_edit", "track_plan_draft"];
const REFRESH = "`/crew:guidelines --refresh` moves crew's hooks and settings to the .mjs scripts and removes the .py once nothing calls it";

export function legacyHints(store: Store): string[] {
  const { ws } = store;
  const at = (...p: string[]) => join(ws.root, ...p);
  const hints: string[] = [];
  const leftovers = LEGACY.filter((n) => ws.isFile(at(".crew", "bin", `${n}.py`)));
  if (leftovers.length) hints.push(`.crew/bin/ still has the Python scripts ${leftovers.map((n) => `${n}.py`).join(", ")} — ${REFRESH}`);
  // the hooks git runs (.git/hooks, or a core.hooksPath anywhere) besides crew's .githooks
  const hookDirs = [git.git(["rev-parse", "--git-path", "hooks"])?.trim(), git.git(["config", "core.hooksPath"])?.trim()]
    .filter((d): d is string => !!d).map((d) => (isAbsolute(d) ? d : at(d)));
  const inDir = (dir: string) => ws.list(dir).filter((f) => !f.endsWith(".sample")).map((f) => relative(ws.root, join(dir, f)));
  const files = [...new Set([...inDir(at(".githooks")), ...hookDirs.flatMap(inDir), ".claude/settings.json", ".claude/settings.local.json",
    ...inDir(at(".github", "workflows")), ".gitlab-ci.yml", "Makefile", ".pre-commit-config.yaml", "package.json", ...inDir(at(".husky"))])];
  for (const file of files) {
    const text = ws.read(join(ws.root, file));
    const calls = text ? LEGACY.filter((n) => text.includes(`.crew/bin/${n}.py`)) : [];
    if (calls.length) hints.push(`${file} still runs ${calls.map((n) => `.crew/bin/${n}.py`).join(", ")} — use node .crew/bin/<name>.mjs (${REFRESH})`);
  }
  if (/^modules:/m.test(ws.read(at(".crew", "config.yaml")) ?? "")) {
    hints.push("`.crew/config.yaml` still has a `modules:` block — nothing in crew is optional any more, so delete it");
  }
  return hints;
}
