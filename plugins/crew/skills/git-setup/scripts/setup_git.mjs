#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/git-setup/setup_git.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { chmodSync, copyFileSync, existsSync as existsSync2, mkdirSync, readdirSync as readdirSync2, readFileSync as readFileSync2, statSync as statSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname, join as join2, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

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

// src/tools/legacy.ts
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
var isFile = (p) => existsSync(p) && statSync(p).isFile();
var git = (root, ...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
var filesIn = (dir) => existsSync(dir) && statSync(dir).isDirectory() ? readdirSync(dir).filter((f) => !f.endsWith(".sample") && isFile(join(dir, f))).map((f) => join(dir, f)) : [];
var crewOwned = (root) => [...filesIn(join(root, ".githooks")), join(root, ".claude", "settings.json")].filter(isFile);
function projectOwned(root, name) {
  const out = /* @__PURE__ */ new Set();
  const grep = git(root, "grep", "-l", "-F", "-e", `${name}.py`, "--", ".", ":!*.md", ":!.crew/**", ":!docs/**");
  for (const f of (grep.stdout ?? "").split("\n").filter(Boolean)) out.add(resolve(root, f));
  for (const f of [
    ...filesIn(join(root, ".github", "workflows")),
    ...filesIn(join(root, ".husky")),
    ...[".gitlab-ci.yml", "Makefile", ".pre-commit-config.yaml", "package.json"].map((f2) => join(root, f2))
  ]) out.add(f);
  const hooksDir = (git(root, "rev-parse", "--git-path", "hooks").stdout ?? "").trim();
  const hooksPath = (git(root, "config", "core.hooksPath").stdout ?? "").trim();
  for (const dir of [hooksDir, hooksPath].filter(Boolean)) for (const f of filesIn(resolve(root, dir))) out.add(f);
  out.add(join(root, ".claude", "settings.local.json"));
  return [...out].filter(isFile);
}
function rewriteText(text, name) {
  const py = `\\.crew/bin/${name})\\.py(?![\\w.])`;
  return text.replace(new RegExp(`(?<![\\w./-])python3?(\\s+)(\\S*?${py}`, "g"), "node$1$2.mjs").replace(new RegExp(`(\\[\\s+-f\\s+\\S*?${py}`, "g"), "$1.mjs");
}
function upgrade(root, names) {
  const out = [];
  const bin = join(root, ".crew", "bin");
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
    const callers = [.../* @__PURE__ */ new Set([...crewOwned(root), ...projectOwned(root, name)])].filter((f) => readFileSync(f, "utf8").includes(`${name}.py`)).map((f) => relative(root, f));
    if (callers.length) {
      out.push(`KEEP    ${relative(root, py)} \u2014 still called from ${callers.join(", ")}; point it at node .crew/bin/${name}.mjs and re-run`);
    } else {
      unlinkSync(py);
      out.push(`REMOVE  ${relative(root, py)} (nothing calls it any more)`);
    }
  }
  return out;
}

// src/tools/git-setup/setup_git.ts
var HERE = dirname(fileURLToPath(import.meta.url));
var ASSETS = join2(HERE, "..", "assets");
function run(root, ...args) {
  return (spawnSync2("git", args, { cwd: root, encoding: "utf8" }).stdout ?? "").trim();
}
function configText(root) {
  const cfg = join2(root, ".crew", "config.yaml");
  return isFile2(cfg) ? readFileSync2(cfg, "utf8") : "";
}
var isFile2 = (p) => existsSync2(p) && statSync2(p).isFile();
function foreignHooks(root) {
  const path = run(root, "config", "core.hooksPath");
  if (path && path !== ".githooks") return `core.hooksPath is '${path}'`;
  const hooksDir = join2(root, ".git", "hooks");
  const real = existsSync2(hooksDir) && statSync2(hooksDir).isDirectory() ? readdirSync2(hooksDir).filter((h) => isFile2(join2(hooksDir, h)) && !h.endsWith(".sample")).sort() : [];
  return real.length ? `.git/hooks has ${real.join(", ")}` : "";
}
function stacksFromConfig(root) {
  const m = /^packs:\s*\[([\s\S]*?)\]/m.exec(configText(root));
  const packs = new Set((m ? m[1] : "").split(",").map((p) => p.trim()));
  const any = (names) => names.some((n) => packs.has(n));
  const stacks = [];
  if (any(["python", "fastapi", "testing-python", "cli-python"])) stacks.push("python");
  if (any(["node", "react", "testing-js"])) stacks.push("node");
  if (packs.has("docker")) stacks.push("docker");
  return stacks;
}
function main() {
  const { values: args } = cli("usage: setup_git.mjs [-h] [--root ROOT] [--stacks STACKS] [--take-over-hooks]", { options: {
    root: { type: "string", default: "." },
    stacks: { type: "string" },
    "take-over-hooks": { type: "boolean", default: false }
  } });
  const root = resolve2(args.root);
  if (!existsSync2(join2(root, ".git"))) {
    const r = spawnSync2("git", ["init", "-q", "-b", "main"], { cwd: root, stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log("git init (main)");
  }
  const stacks = [...args.stacks ? args.stacks.split(",") : stacksFromConfig(root), "graphify"];
  const gi = join2(root, ".gitignore");
  let content = existsSync2(gi) ? readFileSync2(gi, "utf8") : "";
  for (const part of ["base", ...stacks]) {
    if (!content.includes(`# --- ${part} ---`)) {
      content = (content.trim() ? content.trimEnd() + "\n\n" : "") + readFileSync2(join2(ASSETS, "gitignore", `${part}.gitignore`), "utf8");
      console.log(`.gitignore += ${part}`);
    }
  }
  writeFileSync2(gi, content);
  for (const [src, dst] of [["gitattributes", ".gitattributes"], ["pull_request_template.md", ".github/pull_request_template.md"]]) {
    const target = join2(root, dst);
    if (!existsSync2(target)) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync2(target, readFileSync2(join2(ASSETS, src), "utf8"));
      console.log(`wrote ${dst}`);
    }
  }
  const hooks = join2(root, ".githooks");
  mkdirSync(hooks, { recursive: true });
  for (const hook of readdirSync2(join2(ASSETS, "githooks"))) {
    const target = join2(hooks, hook);
    if (!existsSync2(target)) {
      writeFileSync2(target, readFileSync2(join2(ASSETS, "githooks", hook), "utf8"));
      chmodSync(target, 493);
      console.log(`wrote .githooks/${hook}`);
    }
  }
  const secretsSrc = join2(HERE, "check_secrets.mjs");
  const secretsDst = join2(root, ".crew", "bin", "check_secrets.mjs");
  if (!existsSync2(secretsDst) || !readFileSync2(secretsDst).equals(readFileSync2(secretsSrc))) {
    mkdirSync(dirname(secretsDst), { recursive: true });
    copyFileSync(secretsSrc, secretsDst);
    chmodSync(secretsDst, 493);
    console.log("wrote .crew/bin/check_secrets.mjs");
  }
  for (const line of upgrade(root, ["check_secrets"])) console.log(line);
  const existing = foreignHooks(root);
  if (existing && !args["take-over-hooks"]) {
    console.log(`left hooks alone: ${existing}. .githooks/ is written but inactive; merge it into your hooks, or rerun with --take-over-hooks`);
  } else if (run(root, "config", "core.hooksPath") !== ".githooks") {
    run(root, "config", "core.hooksPath", ".githooks");
    console.log("git config core.hooksPath .githooks");
  }
}
main();
