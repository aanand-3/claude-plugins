/** Guard the project's high-level structure against drift.
 *
 * Reads the `structure:` block from .crew/config.yaml:
 *
 *     structure:
 *       .: [backend, frontend, docs, compose.yaml, README.md, CLAUDE.md]
 *       backend/src/ferry: [domain, application, adapters, entrypoints, bootstrap.py, __init__.py]
 *       frontend/src: [app, shared, connections, catalog, main.tsx, index.css, vite-env.d.ts]
 *
 * Each key is a governed directory; the list is the allowed *immediate children*
 * (dirs or files). Only immediate children are checked — deeper layout is the arch
 * rules' and boundary linters' job. Dotfiles/dot-dirs (.nvmrc, .dockerignore, ...) are
 * always allowed in every governed directory.
 * `*` in a name works as a glob (e.g. `*.md`).
 *
 * It also flags source modules longer than `module_max_lines:` (default 300 non-blank lines,
 * 0 disables) — the "no god modules" rule from the base pack. Generated code (migrations, the vendored .crew/bin/ tools) is skipped.
 *
 * It also keeps the layout documentation honest: every directory declared under `.` and
 * under the source roots (keys containing `src`, e.g. backend/src/<pkg>, frontend/src) must be
 * mentioned in docs/architecture.md's `## Repository layout` section, the single home of the
 * layout. Checked on --all, and on commits that touch that file or the config. Warns only.
 *
 * Mode comes from `structure_check:` in config: `warn` (default — report, never block)
 * or `block` (fail the commit). `--strict` forces blocking (e.g. in CI once the layout settles).
 *
 * Usage:
 *   check_structure.mjs --staged   # files being added in this commit (pre-commit hook)
 *   check_structure.mjs --all      # every tracked file — the drift report to refactor from
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const SOURCE_SUFFIXES = new Set([".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".kt", ".rb", ".cs"]);
const GENERATED = ["/migrations/", "alembic/versions/", "/generated/", ".gen.", ".d.ts", "/.crew/bin/"];
const DEFAULT_MAX_LINES = 300;
const EXTENSIONLESS_FILES = new Set(["Makefile", "Dockerfile", "Justfile", "Procfile", "LICENSE", "Gemfile", "Caddyfile"]);
const LAYOUT_DOC = "docs/architecture.md";

const git = (...args: string[]) => spawnSync("git", args, { encoding: "utf8" }).stdout ?? "";
const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
const stripChars = (s: string, chars: string) => s.replace(new RegExp(`^[${chars}]+|[${chars}]+$`, "g"), "");
const rstripSlash = (s: string) => s.replace(/\/+$/, "");
const parts = (p: string) => p.split("/").filter(Boolean);
/** Python's PurePath.suffix of the last path component. */
const suffix = (p: string) => {
  const name = p.split("/").at(-1) ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i) : "";
};
/** Python's fnmatch.fnmatch on POSIX (`*`, `?` and `[seq]`). */
function fnmatch(name: string, pat: string): boolean {
  let re = "";
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === "*") re += ".*";
    else if (c === "?") re += ".";
    else if (c === "[" && pat.indexOf("]", i + 2) > 0) {
      const j = pat.indexOf("]", i + 2);
      let set = pat.slice(i + 1, j).replace(/\\/g, "\\\\");
      if (set.startsWith("!")) set = "^" + set.slice(1);
      re += `[${set}]`;
      i = j;
    } else re += c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(`^(?:${re})$`, "s").test(name);
}
/** Python's repr() of a list of strings, e.g. ['src', 'tests']. */
const reprList = (xs: string[]) => "[" + xs.map((x) => (x.includes("'") && !x.includes('"')
  ? `"${x}"` : `'${x.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`)).join(", ") + "]";

function loadRules(root: string): Map<string, string[]> {
  const cfg = join(root, ".crew", "config.yaml");
  const rules = new Map<string, string[]>();
  if (!isFile(cfg)) return rules;
  let inside = false;
  for (const line of readFileSync(cfg, "utf8").split(/\r?\n/)) {
    if (/^structure:\s*(#.*)?$/.test(line)) {
      inside = true;
      continue;
    }
    if (inside) {
      if (line && !/^[ \t#]/.test(line)) break; // next top-level key
      const m = /^\s+([^:#]+?):\s*\[(.*)\]\s*(#.*)?$/.exec(line);
      if (m) {
        const key = rstripSlash(stripChars(m[1].trim(), "\"'")) || ".";
        rules.set(key, m[2].split(",").filter((x) => x.trim()).map((x) => rstripSlash(stripChars(x.trim(), "\"'"))));
      }
    }
  }
  return rules;
}

function setting(root: string, key: string): string | null {
  const cfg = join(root, ".crew", "config.yaml");
  const m = isFile(cfg) ? new RegExp(`^${key}:\\s*(\\w+)`, "m").exec(readFileSync(cfg, "utf8")) : null;
  return m ? m[1] : null;
}

const mode = (root: string) => setting(root, "structure_check") ?? "warn";
function maxLines(root: string): number {
  const value = setting(root, "module_max_lines");
  return value && /^\d+$/.test(value) ? Number(value) : DEFAULT_MAX_LINES;
}

function violations(paths: string[], rules: Map<string, string[]>): string[] {
  const out: string[] = [];
  for (const path of paths) {
    const p = parts(path);
    for (const [governed, allowed] of rules) {
      const base = governed === "." ? [] : parts(governed);
      if (p.length <= base.length || base.some((b, i) => p[i] !== b)) continue;
      const child = p[base.length];
      if (child.startsWith(".")) continue;
      if (!allowed.some((pat) => fnmatch(child, pat))) {
        out.push(`${path}  →  '${child}' is not an allowed entry of ${governed}/ ${reprList(allowed)}`);
      }
    }
  }
  return out;
}

function oversized(root: string, paths: string[], limit: number): string[] {
  const out: string[] = [];
  for (const path of paths) {
    const f = join(root, path);
    if (limit <= 0 || !SOURCE_SUFFIXES.has(suffix(path)) || GENERATED.some((g) => `/${path}`.includes(g)) || !isFile(f)) continue;
    const n = readFileSync(f, "utf8").split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/).filter((line) => line.trim()).length;
    if (n > limit) out.push(`${path}  →  ${n} lines (> ${limit}): split it by responsibility`);
  }
  return out;
}

/** Declared directories missing from the architecture doc's `## Repository layout` section. */
function layoutDocGaps(root: string, rules: Map<string, string[]>): string[] {
  const doc = join(root, LAYOUT_DOC);
  const text = isFile(doc) ? readFileSync(doc, "utf8") : "";
  const m = /^## Repository layout\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  if (!m) return [`${LAYOUT_DOC} has no \`## Repository layout\` section (see the discover architecture template)`];
  const section = m[1];
  const missing: string[] = [];
  for (const [governed, entries] of rules) {
    if (governed !== "." && !parts(governed).includes("src")) continue;
    for (const name of entries) {
      if (name.includes(".") || name.includes("*") || EXTENSIONLESS_FILES.has(name)) continue; // files and globs; the layout section is about directories
      const escaped = name.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
      if (!new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(section)) missing.push(governed !== "." ? `${governed}/${name}` : name);
    }
  }
  return missing.length ? [`${LAYOUT_DOC} \`## Repository layout\` doesn't mention: ${missing.join(", ")}`] : [];
}

function report(title: string, found: string[], blocking: boolean): void {
  console.error(`${blocking ? "✋" : "⚠️ "} crew ${title}`);
  for (const v of found) console.error(`   ${v}`);
}

function main(): void {
  const { values: args } = parseArgs({ options: {
    staged: { type: "boolean", default: false }, all: { type: "boolean", default: false }, strict: { type: "boolean", default: false },
  } });
  if (args.staged === args.all) {
    console.error("usage: check_structure.mjs (--staged | --all) [--strict]\ncheck_structure.mjs: error: one of the arguments --staged --all is required");
    process.exit(2);
  }
  const root = git("rev-parse", "--show-toplevel").trim() || ".";
  if (!isFile(join(root, ".crew", "config.yaml"))) return;
  const listing = (filter: string) => (args.staged ? git("diff", "--cached", "--name-only", `--diff-filter=${filter}`) : git("ls-files")).split("\n");
  const added = listing("AR"), changed = listing("ACMR");
  const rules = loadRules(root);
  const misplaced = violations(added.filter(Boolean), rules);
  const tooBig = oversized(root, changed.filter(Boolean), maxLines(root));
  if (args.all || changed.includes(LAYOUT_DOC) || changed.includes(".crew/config.yaml")) {
    const gaps = rules.size ? layoutDocGaps(root, rules) : [];
    if (gaps.length) {
      report("layout doc check (warning only):", gaps, false);
      console.error(`   Keep ${LAYOUT_DOC} → Repository layout in step with \`structure:\`; it's the one place the layout is described.`);
    }
  }
  if (!misplaced.length && !tooBig.length) return;
  const blocking = args.strict || mode(root) === "block";
  if (misplaced.length) {
    report(`structure check: ${misplaced.length} file(s) outside the declared layout (.crew/config.yaml → structure:)`, misplaced, blocking);
  }
  if (tooBig.length) report(`module size check: ${tooBig.length} module(s) over module_max_lines (.crew/config.yaml)`, tooBig, blocking);
  if (blocking) {
    console.error("   Move the code into the declared structure / split oversized modules, or update the config (and project.md / an ADR) with the reason.");
    process.exit(1);
  }
  console.error("   Not blocking (structure_check: warn). Record it as a follow-up in the plan's Outcome so it can be");
  console.error("   refactored later, or update the config if the layout should change. Full report: check_structure.mjs --all");
}

main();
