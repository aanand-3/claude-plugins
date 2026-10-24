#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/guidelines/check_structure.ts
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// src/tools/cli.ts
import { parseArgs } from "node:util";
function cli(usage, config) {
  try {
    return parseArgs(config);
  } catch (e) {
    return usageError(usage, e.message);
  }
}
function usageError(usage, message) {
  const name = usage.split(" ")[1] ?? "script";
  console.error(`${usage}
${name}: error: ${message}`);
  process.exit(2);
}
var DIGITS = String.raw`\d+(?:_\d+)*`;
var INT = new RegExp(`^[+-]?${DIGITS}$`);
var FLOAT = new RegExp(`^[+-]?(?:(?:${DIGITS})?\\.${DIGITS}|${DIGITS}\\.?)(?:[eE][+-]?${DIGITS})?$`);
function exclusive(usage, flags) {
  const given = process.argv.slice(2).map((a) => a.split("=")[0]).filter((a, i, all) => flags.includes(a) && all.indexOf(a) === i);
  if (given.length > 1) usageError(usage, `argument ${given[1]}: not allowed with argument ${given[0]}`);
}

// src/tools/guidelines/check_structure.ts
var SOURCE_SUFFIXES = /* @__PURE__ */ new Set([".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".kt", ".rb", ".cs"]);
var GENERATED = ["/migrations/", "alembic/versions/", "/generated/", ".gen.", ".d.ts", "/.crew/bin/"];
var DEFAULT_MAX_LINES = 300;
var EXTENSIONLESS_FILES = /* @__PURE__ */ new Set(["Makefile", "Dockerfile", "Justfile", "Procfile", "LICENSE", "Gemfile", "Caddyfile"]);
var LAYOUT_DOC = "docs/architecture.md";
var git = (...args) => spawnSync("git", args, { encoding: "utf8" }).stdout ?? "";
var isFile = (p) => existsSync(p) && statSync(p).isFile();
var stripChars = (s, chars) => s.replace(new RegExp(`^[${chars}]+|[${chars}]+$`, "g"), "");
var rstripSlash = (s) => s.replace(/\/+$/, "");
var parts = (p) => p.split("/").filter(Boolean);
var suffix = (p) => {
  const name = p.split("/").at(-1) ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i) : "";
};
function fnmatch(name, pat) {
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
var reprList = (xs) => "[" + xs.map((x) => x.includes("'") && !x.includes('"') ? `"${x}"` : `'${x.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`).join(", ") + "]";
function loadRules(root) {
  const cfg = join(root, ".crew", "config.yaml");
  const rules = /* @__PURE__ */ new Map();
  if (!isFile(cfg)) return rules;
  let inside = false;
  for (const line of readFileSync(cfg, "utf8").split(/\r?\n/)) {
    if (/^structure:\s*(#.*)?$/.test(line)) {
      inside = true;
      continue;
    }
    if (inside) {
      if (line && !/^[ \t#]/.test(line)) break;
      const m = /^\s+([^:#]+?):\s*\[(.*)\]\s*(#.*)?$/.exec(line);
      if (m) {
        const key = rstripSlash(stripChars(m[1].trim(), `"'`)) || ".";
        rules.set(key, m[2].split(",").filter((x) => x.trim()).map((x) => rstripSlash(stripChars(x.trim(), `"'`))));
      }
    }
  }
  return rules;
}
function setting(root, key) {
  const cfg = join(root, ".crew", "config.yaml");
  const m = isFile(cfg) ? new RegExp(`^${key}:\\s*(\\w+)`, "m").exec(readFileSync(cfg, "utf8")) : null;
  return m ? m[1] : null;
}
var mode = (root) => setting(root, "structure_check") ?? "warn";
function maxLines(root) {
  const value = setting(root, "module_max_lines");
  return value && /^\d+$/.test(value) ? Number(value) : DEFAULT_MAX_LINES;
}
function violations(paths, rules) {
  const out = [];
  for (const path of paths) {
    const p = parts(path);
    for (const [governed, allowed] of rules) {
      const base = governed === "." ? [] : parts(governed);
      if (p.length <= base.length || base.some((b, i) => p[i] !== b)) continue;
      const child = p[base.length];
      if (child.startsWith(".")) continue;
      if (!allowed.some((pat) => fnmatch(child, pat))) {
        out.push(`${path}  \u2192  '${child}' is not an allowed entry of ${governed}/ ${reprList(allowed)}`);
      }
    }
  }
  return out;
}
function oversized(root, paths, limit) {
  const out = [];
  for (const path of paths) {
    const f = join(root, path);
    if (limit <= 0 || !SOURCE_SUFFIXES.has(suffix(path)) || GENERATED.some((g) => `/${path}`.includes(g)) || !isFile(f)) continue;
    const n = readFileSync(f, "utf8").split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/).filter((line) => line.trim()).length;
    if (n > limit) out.push(`${path}  \u2192  ${n} lines (> ${limit}): split it by responsibility`);
  }
  return out;
}
function layoutDocGaps(root, rules) {
  const doc = join(root, LAYOUT_DOC);
  const text = isFile(doc) ? readFileSync(doc, "utf8") : "";
  const m = /^## Repository layout\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  if (!m) return [`${LAYOUT_DOC} has no \`## Repository layout\` section (see the discover architecture template)`];
  const section = m[1];
  const missing = [];
  for (const [governed, entries] of rules) {
    if (governed !== "." && !parts(governed).includes("src")) continue;
    for (const name of entries) {
      if (name.includes(".") || name.includes("*") || EXTENSIONLESS_FILES.has(name)) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
      if (!new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(section)) missing.push(governed !== "." ? `${governed}/${name}` : name);
    }
  }
  return missing.length ? [`${LAYOUT_DOC} \`## Repository layout\` doesn't mention: ${missing.join(", ")}`] : [];
}
function report(title, found, blocking) {
  console.error(`${blocking ? "\u270B" : "\u26A0\uFE0F "} crew ${title}`);
  for (const v of found) console.error(`   ${v}`);
}
function main() {
  const usage = "usage: check_structure.mjs [-h] (--staged | --all) [--strict]";
  const { values: args } = cli(usage, { options: {
    staged: { type: "boolean", default: false },
    all: { type: "boolean", default: false },
    strict: { type: "boolean", default: false }
  } });
  exclusive(usage, ["--staged", "--all"]);
  if (!args.staged && !args.all) usageError(usage, "one of the arguments --staged --all is required");
  const root = git("rev-parse", "--show-toplevel").trim() || ".";
  if (!isFile(join(root, ".crew", "config.yaml"))) return;
  const listing = (filter) => (args.staged ? git("diff", "--cached", "--name-only", `--diff-filter=${filter}`) : git("ls-files")).split("\n");
  const added = listing("AR"), changed = listing("ACMR");
  const rules = loadRules(root);
  const misplaced = violations(added.filter(Boolean), rules);
  const tooBig = oversized(root, changed.filter(Boolean), maxLines(root));
  if (args.all || changed.includes(LAYOUT_DOC) || changed.includes(".crew/config.yaml")) {
    const gaps = rules.size ? layoutDocGaps(root, rules) : [];
    if (gaps.length) {
      report("layout doc check (warning only):", gaps, false);
      console.error(`   Keep ${LAYOUT_DOC} \u2192 Repository layout in step with \`structure:\`; it's the one place the layout is described.`);
    }
  }
  if (!misplaced.length && !tooBig.length) return;
  const blocking = args.strict || mode(root) === "block";
  if (misplaced.length) {
    report(`structure check: ${misplaced.length} file(s) outside the declared layout (.crew/config.yaml \u2192 structure:)`, misplaced, blocking);
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
