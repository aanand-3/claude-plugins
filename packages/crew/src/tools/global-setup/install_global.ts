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
import { unifiedDiff } from "./difflib.js";

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
      if (!rest.includes(end)) throw new Error(`the ${end} marker comes before ${start}; fix the file by hand`);
      const post = rest.slice(rest.indexOf(end) + end.length);
      return pre + wrapped.replace(/\n+$/, "") + post;
    }
  }
  return existing.trimEnd() + (existing.trim() ? "\n\n" : "") + wrapped;
}

/** Lines with their endings, like Python's str.splitlines(keepends=True). */
const linesOf = (s: string) => s.match(/[^\n]*\n|[^\n]+$/g) ?? [];

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
  let next: string;
  try {
    next = merged(existing, readFileSync(ASSET, "utf8"));
  } catch (e) {
    console.error(`${target}: ${(e as Error).message}`);
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
