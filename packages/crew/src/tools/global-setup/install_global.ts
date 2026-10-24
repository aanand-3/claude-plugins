/** Install/refresh the crew block in the user's global ~/.claude/CLAUDE.md.
 *
 * The block is wrapped in markers so re-running updates it in place and leaves
 * everything else in the file untouched. A timestamped backup is written first.
 *
 * Usage: install_global.mjs [--check | --apply] [--target PATH]
 *   --check  (default) print status and the diff, change nothing
 *   --apply  write the block
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cli } from "../cli.js";

const START = "<!-- crew:global:start -->";
const END = "<!-- crew:global:end -->";
const LEGACY: [string, string] = ["<!-- project-kit:global:start -->", "<!-- project-kit:global:end -->"]; // before the rename to crew
const ASSET = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "CLAUDE.global.md");

function merged(existing: string, block: string): string {
  const wrapped = `${START}\n${block.trim()}\n${END}\n`;
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

/** Lines with their endings, like Python's str.splitlines(keepends=True). */
const linesOf = (s: string) => s.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/** difflib.unified_diff(a, b, fromfile, tofile) with 3 lines of context, from a longest-common-subsequence match. */
function unifiedDiff(a: string[], b: string[], from: string, to: string): string {
  const n = a.length, m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: [" " | "-" | "+", number, number][] = []; // (op, index in a, index in b)
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) ops.push([" ", i++, j++]);
    else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) ops.push(["-", i++, j]); // removals first, as difflib prints them
    else ops.push(["+", i, j++]);
  }
  // group the changed lines into hunks: changes closer than 2 × 3 context lines share one
  const groups: [number, number][] = [];
  ops.forEach(([op], k) => {
    if (op === " ") return;
    const last = groups.at(-1);
    if (last && k - last[1] <= 6) last[1] = k + 1;
    else groups.push([k, k + 1]);
  });
  const range = (start: number, len: number) => (len === 1 ? `${start + 1}` : `${len ? start + 1 : start},${len}`);
  const out = [`--- ${from}\n`, `+++ ${to}\n`];
  for (const [first, end] of groups) {
    const hunk = ops.slice(Math.max(0, first - 3), Math.min(ops.length, end + 3));
    const aLen = hunk.filter(([op]) => op !== "+").length, bLen = hunk.filter(([op]) => op !== "-").length;
    out.push(`@@ -${range(hunk[0][1], aLen)} +${range(hunk[0][2], bLen)} @@\n`);
    for (const [op, x, y] of hunk) out.push(op + (op === "+" ? b[y] : a[x]));
  }
  return groups.length ? out.join("") : "";
}

const stamp = () => {
  const d = new Date(), p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

function main(): void {
  const { values: args } = cli("usage: install_global.mjs [-h] [--apply] [--check] [--target TARGET]", { options: {
    apply: { type: "boolean", default: false }, check: { type: "boolean", default: false },
    target: { type: "string", default: join(homedir(), ".claude", "CLAUDE.md") },
  } });
  const target = args.target!.replace(/^~(?=$|\/)/, homedir());
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
    console.log("\n(dry run — re-run with --apply to write)");
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
