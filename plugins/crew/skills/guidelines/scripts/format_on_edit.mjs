#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/guidelines/format_on_edit.ts
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { delimiter, dirname, extname, join, resolve, sep } from "node:path";
var PRETTIER_EXT = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".html", ".yaml", ".yml"]);
var real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
function nearest(start, marker, stop) {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, marker))) return d;
    if (d === stop || dirname(d) === d) return null;
  }
}
function which(name) {
  for (const dir of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    try {
      accessSync(join(dir, name), constants.X_OK);
      return join(dir, name);
    } catch {
    }
  }
  return null;
}
var run = (cmd, args, cwd) => {
  spawnSync(cmd, args, { cwd, stdio: "ignore", timeout: 3e4 });
};
function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }
  const filePath = (payload.tool_input || {}).file_path;
  if (!filePath) return;
  const project = real(process.env.CLAUDE_PROJECT_DIR ?? (payload.cwd || "."));
  if (!existsSync(filePath) || !statSync(filePath).isFile() || !real(filePath).startsWith(project + sep)) return;
  const ext = extname(filePath);
  if (ext === ".py") {
    const root = nearest(dirname(filePath), "pyproject.toml", project);
    if (!root) return;
    const ruff = join(root, ".venv", "bin", "ruff");
    const exe = existsSync(ruff) ? ruff : which("ruff");
    if (exe) {
      run(exe, ["check", "--fix", "--select", "I", "--quiet", filePath], root);
      run(exe, ["format", "--quiet", filePath], root);
    }
  } else if (PRETTIER_EXT.has(ext)) {
    const root = nearest(dirname(filePath), "package.json", project);
    const prettier = root ? join(root, "node_modules", ".bin", "prettier") : null;
    if (prettier && existsSync(prettier)) run(prettier, ["--write", "--log-level", "silent", filePath], root);
  }
}
try {
  main();
} catch {
}
