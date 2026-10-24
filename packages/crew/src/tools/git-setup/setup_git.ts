/** Initialize git conventions for a crew project. Idempotent; never commits.
 *
 * - git init -b main (if not a repo)
 * - .gitignore composed from stack parts (appends missing sections only)
 * - .gitattributes, .github/pull_request_template.md (if absent)
 * - versioned hooks in .githooks/ + `git config core.hooksPath .githooks`
 *   (an existing hooks setup, e.g. Husky, is left alone unless --take-over-hooks)
 *
 * Usage: setup_git.mjs [--root DIR] [--stacks python,node,docker] [--take-over-hooks]
 *        (stacks default: derived from .crew/config.yaml packs)
 */
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "assets");

function run(root: string, ...args: string[]): string {
  return (spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout ?? "").trim();
}

function configText(root: string): string {
  const cfg = join(root, ".crew", "config.yaml");
  return isFile(cfg) ? readFileSync(cfg, "utf8") : "";
}

const isFile = (p: string) => existsSync(p) && statSync(p).isFile();

/** Describe a hooks setup crew would replace, or '' if there is none. */
function foreignHooks(root: string): string {
  const path = run(root, "config", "core.hooksPath");
  if (path && path !== ".githooks") return `core.hooksPath is '${path}'`;
  const hooksDir = join(root, ".git", "hooks");
  const real = existsSync(hooksDir) && statSync(hooksDir).isDirectory()
    ? readdirSync(hooksDir).filter((h) => isFile(join(hooksDir, h)) && !h.endsWith(".sample")).sort() : [];
  return real.length ? `.git/hooks has ${real.join(", ")}` : "";
}

function stacksFromConfig(root: string): string[] {
  const m = /^packs:\s*\[([\s\S]*?)\]/m.exec(configText(root));
  const packs = new Set((m ? m[1] : "").split(",").map((p) => p.trim()));
  const any = (names: string[]) => names.some((n) => packs.has(n));
  const stacks: string[] = [];
  if (any(["python", "fastapi", "testing-python", "cli-python"])) stacks.push("python");
  if (any(["node", "react", "testing-js"])) stacks.push("node");
  if (packs.has("docker")) stacks.push("docker");
  return stacks;
}

function main(): void {
  const { values: args } = parseArgs({ options: {
    root: { type: "string", default: "." }, stacks: { type: "string" }, "take-over-hooks": { type: "boolean", default: false },
  } });
  const root = resolve(args.root!);

  if (!existsSync(join(root, ".git"))) {
    const r = spawnSync("git", ["init", "-q", "-b", "main"], { cwd: root, stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log("git init (main)");
  }

  const stacks = [...(args.stacks ? args.stacks.split(",") : stacksFromConfig(root)), "graphify"]; // the code graph is always on
  const gi = join(root, ".gitignore");
  let content = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  for (const part of ["base", ...stacks]) {
    if (!content.includes(`# --- ${part} ---`)) {
      content = (content.trim() ? content.trimEnd() + "\n\n" : "") + readFileSync(join(ASSETS, "gitignore", `${part}.gitignore`), "utf8");
      console.log(`.gitignore += ${part}`);
    }
  }
  writeFileSync(gi, content);

  for (const [src, dst] of [["gitattributes", ".gitattributes"], ["pull_request_template.md", ".github/pull_request_template.md"]]) {
    const target = join(root, dst);
    if (!existsSync(target)) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(ASSETS, src), "utf8"));
      console.log(`wrote ${dst}`);
    }
  }

  const hooks = join(root, ".githooks");
  mkdirSync(hooks, { recursive: true });
  for (const hook of readdirSync(join(ASSETS, "githooks"))) {
    const target = join(hooks, hook);
    if (!existsSync(target)) {
      writeFileSync(target, readFileSync(join(ASSETS, "githooks", hook), "utf8"));
      chmodSync(target, 0o755);
      console.log(`wrote .githooks/${hook}`);
    }
  }
  const secretsSrc = join(HERE, "check_secrets.mjs");
  const secretsDst = join(root, ".crew", "bin", "check_secrets.mjs");
  if (!existsSync(secretsDst) || !readFileSync(secretsDst).equals(readFileSync(secretsSrc))) {
    mkdirSync(dirname(secretsDst), { recursive: true });
    copyFileSync(secretsSrc, secretsDst);
    chmodSync(secretsDst, 0o755);
    console.log("wrote .crew/bin/check_secrets.mjs");
  }

  const existing = foreignHooks(root);
  if (existing && !args["take-over-hooks"]) {
    console.log(`left hooks alone: ${existing}. .githooks/ is written but inactive; `
      + "merge it into your hooks, or rerun with --take-over-hooks");
  } else if (run(root, "config", "core.hooksPath") !== ".githooks") {
    run(root, "config", "core.hooksPath", ".githooks");
    console.log("git config core.hooksPath .githooks");
  }
}

main();
