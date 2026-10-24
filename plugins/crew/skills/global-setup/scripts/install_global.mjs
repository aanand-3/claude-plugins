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

// src/tools/global-setup/difflib.ts
var SequenceMatcher = class {
  constructor(a, b) {
    this.a = a;
    this.b = b;
    b.forEach((elt, i) => {
      if (!this.b2j.has(elt)) this.b2j.set(elt, []);
      this.b2j.get(elt).push(i);
    });
    if (b.length >= 200) {
      const ntest = Math.floor(b.length / 100) + 1;
      for (const [elt, idxs] of this.b2j) if (idxs.length > ntest) this.b2j.delete(elt);
    }
  }
  a;
  b;
  b2j = /* @__PURE__ */ new Map();
  findLongestMatch(alo, ahi, blo, bhi) {
    const { a, b } = this;
    let besti = alo, bestj = blo, bestsize = 0;
    let j2len = /* @__PURE__ */ new Map();
    for (let i = alo; i < ahi; i++) {
      const next = /* @__PURE__ */ new Map();
      for (const j of this.b2j.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        next.set(j, k);
        if (k > bestsize) [besti, bestj, bestsize] = [i - k + 1, j - k + 1, k];
      }
      j2len = next;
    }
    while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) {
      besti--;
      bestj--;
      bestsize++;
    }
    while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
    return [besti, bestj, bestsize];
  }
  matchingBlocks() {
    const la = this.a.length, lb = this.b.length;
    const queue = [[0, la, 0, lb]];
    const blocks = [];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop();
      const [i, j, k] = this.findLongestMatch(alo, ahi, blo, bhi);
      if (!k) continue;
      blocks.push([i, j, k]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
    blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    const merged2 = [];
    let [i1, j1, k1] = [0, 0, 0];
    for (const [i2, j2, k2] of blocks) {
      if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2;
      else {
        if (k1) merged2.push([i1, j1, k1]);
        [i1, j1, k1] = [i2, j2, k2];
      }
    }
    if (k1) merged2.push([i1, j1, k1]);
    merged2.push([la, lb, 0]);
    return merged2;
  }
  opcodes() {
    let i = 0, j = 0;
    const out = [];
    for (const [ai, bj, size] of this.matchingBlocks()) {
      const tag = i < ai && j < bj ? "replace" : i < ai ? "delete" : j < bj ? "insert" : "";
      if (tag) out.push([tag, i, ai, j, bj]);
      [i, j] = [ai + size, bj + size];
      if (size) out.push(["equal", ai, i, bj, j]);
    }
    return out;
  }
  groupedOpcodes(n = 3) {
    const codes = this.opcodes();
    if (!codes.length) codes.push(["equal", 0, 1, 0, 1]);
    const first = codes[0], last = codes.at(-1);
    if (first[0] === "equal") codes[0] = ["equal", Math.max(first[1], first[2] - n), first[2], Math.max(first[3], first[4] - n), first[4]];
    if (last[0] === "equal") codes[codes.length - 1] = ["equal", last[1], Math.min(last[2], last[1] + n), last[3], Math.min(last[4], last[3] + n)];
    const groups = [];
    let group = [];
    for (let [tag, i1, i2, j1, j2] of codes) {
      if (tag === "equal" && i2 - i1 > 2 * n) {
        group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
        groups.push(group);
        group = [];
        [i1, j1] = [Math.max(i1, i2 - n), Math.max(j1, j2 - n)];
      }
      group.push([tag, i1, i2, j1, j2]);
    }
    if (group.length && !(group.length === 1 && group[0][0] === "equal")) groups.push(group);
    return groups;
  }
};
var range = (start, stop) => {
  const length = stop - start;
  return length === 1 ? `${start + 1}` : `${length ? start + 1 : start},${length}`;
};
function unifiedDiff(a, b, from, to) {
  const out = [];
  for (const group of new SequenceMatcher(a, b).groupedOpcodes()) {
    if (!out.length) out.push(`--- ${from}
`, `+++ ${to}
`);
    const first = group[0], last = group.at(-1);
    out.push(`@@ -${range(first[1], last[2])} +${range(first[3], last[4])} @@
`);
    for (const [tag, i1, i2, j1, j2] of group) {
      if (tag === "equal") {
        out.push(...a.slice(i1, i2).map((l) => " " + l));
        continue;
      }
      if (tag !== "insert") out.push(...a.slice(i1, i2).map((l) => "-" + l));
      if (tag !== "delete") out.push(...b.slice(j1, j2).map((l) => "+" + l));
    }
  }
  return out.join("");
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
      if (!rest.includes(end)) throw new Error(`the ${end} marker comes before ${start}; fix the file by hand`);
      const post = rest.slice(rest.indexOf(end) + end.length);
      return pre + wrapped.replace(/\n+$/, "") + post;
    }
  }
  return existing.trimEnd() + (existing.trim() ? "\n\n" : "") + wrapped;
}
var linesOf = (s) => s.match(/[^\n]*\n|[^\n]+$/g) ?? [];
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
  let next;
  try {
    next = merged(existing, readFileSync(ASSET, "utf8"));
  } catch (e) {
    console.error(`${target}: ${e.message}`);
    process.exit(1);
  }
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
