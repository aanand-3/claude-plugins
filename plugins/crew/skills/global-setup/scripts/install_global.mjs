#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/global-setup/install_global.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
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

// src/tools/global-setup/install_global.ts
var START = "<!-- crew:global:start -->";
var END = "<!-- crew:global:end -->";
var LEGACY = ["<!-- project-kit:global:start -->", "<!-- project-kit:global:end -->"];
var ASSET = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "CLAUDE.global.md");
function merged(existing, block) {
  const wrapped = `${START}
${block.trim()}
${END}
`;
  for (const [start, end] of [[START, END], LEGACY]) {
    if (existing.includes(start) && existing.includes(end)) {
      const i = existing.indexOf(start);
      const pre = existing.slice(0, i), rest = existing.slice(i + start.length);
      const post = rest.slice(rest.indexOf(end) + end.length);
      return pre + wrapped.replace(/\n+$/, "") + post;
    }
  }
  return existing.trimEnd() + (existing.trim() ? "\n\n" : "") + wrapped;
}
var linesOf = (s) => s.match(/[^\n]*\n|[^\n]+$/g) ?? [];
function unifiedDiff(a, b, from, to) {
  const n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i2 = n - 1; i2 >= 0; i2--) for (let j2 = m - 1; j2 >= 0; j2--) lcs[i2][j2] = a[i2] === b[j2] ? lcs[i2 + 1][j2 + 1] + 1 : Math.max(lcs[i2 + 1][j2], lcs[i2][j2 + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) ops.push([" ", i++, j++]);
    else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) ops.push(["-", i++, j]);
    else ops.push(["+", i, j++]);
  }
  const groups = [];
  ops.forEach(([op], k) => {
    if (op === " ") return;
    const last = groups.at(-1);
    if (last && k - last[1] <= 6) last[1] = k + 1;
    else groups.push([k, k + 1]);
  });
  const range = (start, len) => len === 1 ? `${start + 1}` : `${len ? start + 1 : start},${len}`;
  const out = [`--- ${from}
`, `+++ ${to}
`];
  for (const [first, end] of groups) {
    const hunk = ops.slice(Math.max(0, first - 3), Math.min(ops.length, end + 3));
    const aLen = hunk.filter(([op]) => op !== "+").length, bLen = hunk.filter(([op]) => op !== "-").length;
    out.push(`@@ -${range(hunk[0][1], aLen)} +${range(hunk[0][2], bLen)} @@
`);
    for (const [op, x, y] of hunk) out.push(op + (op === "+" ? b[y] : a[x]));
  }
  return groups.length ? out.join("") : "";
}
var stamp = () => {
  const d = /* @__PURE__ */ new Date(), p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
function main() {
  const { values: args } = cli("usage: install_global.mjs [-h] [--apply] [--check] [--target TARGET]", { options: {
    apply: { type: "boolean", default: false },
    check: { type: "boolean", default: false },
    target: { type: "string", default: join(homedir(), ".claude", "CLAUDE.md") }
  } });
  const target = args.target.replace(/^~(?=$|\/)/, homedir());
  const existing = existsSync(target) ? readFileSync(target, "utf8") : "";
  const next = merged(existing, readFileSync(ASSET, "utf8"));
  const state = existing.includes(START) || existing.includes(LEGACY[0]) ? "installed" : existing ? "absent (file exists)" : "absent (no file)";
  if (next === existing) {
    console.log(`${target}: up to date`);
    return;
  }
  console.log(`${target}: block ${state}; changes:`);
  process.stdout.write(unifiedDiff(linesOf(existing), linesOf(next), "current", "proposed"));
  if (!args.apply) {
    console.log("\n(dry run \u2014 re-run with --apply to write)");
    return;
  }
  if (existing) {
    const backup = join(dirname(target), `CLAUDE.md.bak-${stamp()}`);
    copyFileSync(target, backup);
    console.log(`backup: ${backup}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, next);
  console.log(`wrote ${target}`);
}
main();
