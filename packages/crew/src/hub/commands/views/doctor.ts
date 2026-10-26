/** `doctor`: whether this project is ready for the autonomous loop — the base branch, plan worktrees, the vendored hub,
 * agents, Claude Code hooks, generated and shared globs, the policy, and git hooks that accept the hub's commits. It only
 * reports: each problem names who fixes it (the human, `/crew:guidelines`, `crew.mjs agents`). */
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import * as git from "../../core/git.js";
import { resolvePolicy } from "../../core/team/policy.js";
import { trackedFiles } from "../../core/work/footprint.js";
import { type Store, yamlBlock } from "../../core/store.js";
import { agentProblems } from "../team/agents.js";

export type Level = "ok" | "warn" | "fail";
export interface Check { id: string; level: Level; detail: string; fix: string | null }

const ok = (id: string, detail: string): Check => ({ id, level: "ok", detail, fix: null });
const warn = (id: string, detail: string, fix: string): Check => ({ id, level: "warn", detail, fix });
const bad = (id: string, detail: string, fix: string): Check => ({ id, level: "fail", detail, fix });

/** A YAML file under .crew/ as an object; {} when missing, null when it doesn't parse. */
function yamlFile(store: Store, name: string): Record<string, unknown> | null {
  const text = store.ws.read(join(store.dir, name));
  try {
    const v = parse(text ?? "") as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}

const branchOf = (home: string) => git.git(["-C", home, "branch", "--show-current"])?.trim() || null;

function baseBranch(store: Store): Check {
  const base = store.baseBranch();
  return git.git(["-C", store.home, "rev-parse", "--verify", "-q", `refs/heads/${base}`]) !== null
    ? ok("base-branch", base)
    : bad("base-branch", `the base branch '${base}' doesn't exist`, "set git.default_branch in .crew/config.yaml");
}

function mainCheckout(store: Store): Check {
  if (!store.settings().plan_worktrees) return ok("main-checkout", "not needed without hub.plan_worktrees");
  const base = store.baseBranch(), at = branchOf(store.home);
  return at === base ? ok("main-checkout", `${store.home} is on ${base}`)
    : bad("main-checkout", `the main checkout (${store.home}) is on ${at ?? "a detached HEAD"}, not ${base}`,
      `switch it back: git -C ${store.home} switch ${base}`);
}

function planWorktrees(store: Store): Check {
  return store.settings().plan_worktrees ? ok("plan-worktrees", "on")
    : warn("plan-worktrees", "hub.plan_worktrees is off: plans can't run side by side", "set hub.plan_worktrees: true in .crew/config.yaml");
}

function vendoredHub(store: Store): Check {
  return store.ws.isFile(join(store.dir, "bin", "crew.mjs")) ? ok("vendored-hub", ".crew/bin/crew.mjs")
    : bad("vendored-hub", ".crew/bin/crew.mjs is missing", "run `crew.mjs init`");
}

function agents(store: Store): Check[] {
  const problems = agentProblems(store);
  if (!problems.length) return [ok("agents", "rendered and up to date")];
  return problems.map((p) => warn("agents", `${store.rel(p.path)} is ${p.problem}`,
    "the human runs `crew.mjs agents` and starts a new session"));
}

/** The commands of each hook event in .claude/settings.json, or null when the file is missing or unreadable. */
function hookCommands(store: Store): Record<string, string[]> | null {
  const text = store.ws.read(join(store.home, ".claude", "settings.json"));
  if (text === null) return null;
  try {
    const hooks = (JSON.parse(text) as { hooks?: Record<string, { hooks?: { command?: string }[] }[]> }).hooks ?? {};
    return Object.fromEntries(Object.entries(hooks).map(([event, groups]) =>
      [event, (Array.isArray(groups) ? groups : []).flatMap((g) => (g.hooks ?? []).map((h) => h.command ?? ""))]));
  } catch {
    return null;
  }
}

const HOOKS: { event: string; re: RegExp; name: string; required: boolean }[] = [
  { event: "PreToolUse", re: /crew\.mjs guard\b/, name: "the PreToolUse guard (`crew.mjs guard`)", required: true },
  { event: "SubagentStop", re: /crew\.mjs usage --hook\b/, name: "the SubagentStop `crew.mjs usage --hook`", required: false },
  { event: "PostToolUse", re: /crew\.mjs activity --hook\b/, name: "the PostToolUse `crew.mjs activity --hook`", required: false },
  { event: "SessionStart", re: /crew\.mjs context\b/, name: "the SessionStart `crew.mjs context`", required: false },
  { event: "Stop", re: /crew\.mjs checkpoint --auto\b/, name: "the Stop `crew.mjs checkpoint --auto`", required: false },
  { event: "PreCompact", re: /crew\.mjs checkpoint --auto\b/, name: "the PreCompact `crew.mjs checkpoint --auto`", required: false },
];
const HOOKS_FIX = "the human runs `/crew:guidelines --refresh` (its merge_settings.mjs adds the template's missing hooks; "
  + ".claude/settings.json is protected)";

function hooks(store: Store): Check[] {
  const commands = hookCommands(store) ?? {};
  const out = HOOKS.filter((h) => !(commands[h.event] ?? []).some((c) => h.re.test(c)))
    .map((h) => (h.required ? bad : warn)("hooks", `.claude/settings.json has no ${h.name}`, HOOKS_FIX));
  return out.length ? out : [ok("hooks", "guard, usage, activity, context and checkpoint hooks are set")];
}

function generated(store: Store): Check {
  const build = yamlBlock(store.ws.read(join(store.dir, "config.yaml")) ?? "", "hub").build;
  if (!build) return ok("generated", "no hub.build");
  const n = trackedFiles(store.home).generated.size;
  return n ? ok("generated", `${n} tracked file(s) marked linguist-generated`)
    : warn("generated", "hub.build is set but .gitattributes marks no tracked file linguist-generated: Release can't tell generated files from source",
      "mark the build's outputs linguist-generated in .gitattributes");
}

function shared(store: Store): Check {
  const config = yamlFile(store, "config.yaml");
  const v = (config?.hub as { shared?: unknown } | undefined)?.shared;
  if (v === undefined || v === null) {
    return warn("shared", "no hub.shared: every overlap on a registry or doc blocks staffing",
      "list the shared files (exact files, not directories) under hub.shared in .crew/config.yaml");
  }
  return Array.isArray(v) && v.every((g) => typeof g === "string") ? ok("shared", `${v.length} shared glob(s)`)
    : bad("shared", "hub.shared: expected a list of path globs", "write hub.shared as a YAML list of exact files");
}

function policy(store: Store): Check {
  const r = resolvePolicy(store.home, store.dir);
  if (r.errors.length) return bad("policy", r.errors[0], "fix .crew/policy.yaml (`crew.mjs policy check`)");
  const preset = yamlFile(store, "policy.yaml")?.preset;
  return typeof preset === "string" ? ok("policy", `preset: ${preset}`)
    : warn("policy", "no preset: the team runs best under `preset: lifecycle` — a policy change, yours",
      "the human sets `preset: lifecycle` in .crew/policy.yaml, or decides against it");
}

function hubCommits(store: Store): Check {
  if (!store.settings().plan_worktrees) return ok("hub-commits", "not needed without hub.plan_worktrees");
  const base = store.baseBranch(), refused = probeHubCommit(store.home);
  return refused === null ? ok("hub-commits", `the git hooks accept a hub commit on ${base}`)
    : bad("hub-commits", `${refused.hook} refuses a hub commit on ${base}: ${refused.message}`,
      `allow commits on ${base} whose staged paths are all under .crew/ in your pre-commit (crew's git-setup hook does), `
      + "or turn hub.plan_worktrees off");
}

export function doctorChecks(store: Store, progress: (line: string) => void = () => {}): Check[] {
  const checks = [baseBranch(store), mainCheckout(store), planWorktrees(store), vendoredHub(store), ...agents(store),
    ...hooks(store), generated(store), shared(store), policy(store)];
  if (store.settings().plan_worktrees) progress("doctor: running the git hooks against a probe hub commit (hub-commits)…");
  return [...checks, hubCommits(store)];
}

export function doctor(store: Store, json = false): number {
  store.require();
  const checks = doctorChecks(store, json ? undefined : (line) => process.stderr.write(`${line}\n`));
  if (json) store.say(JSON.stringify({ checks }, null, 2));
  else {
    for (const c of checks) store.say(`${c.level.toUpperCase().padEnd(4)}  ${c.id}: ${c.detail}${c.fix ? ` → ${c.fix}` : ""}`);
  }
  return checks.some((c) => c.level === "fail") ? 1 : 0;
}

// -- the hub-commits probe

/** Run one git hook as git would, with `env`; null when it passes or is missing, else its first line of output. Uses
 * `git hook run` (git ≥ 2.36), else the hook file under `git rev-parse --git-path hooks`. */
function runHook(home: string, hook: string, args: string[], env: NodeJS.ProcessEnv): string | null {
  const opts = { cwd: home, env, encoding: "utf8" as const };
  let r = spawnSync("git", ["hook", "run", "--ignore-missing", hook, ...(args.length ? ["--", ...args] : [])], opts);
  if (r.status === 129 || /not a git command|usage: git hook/.test(r.stderr ?? "")) {
    const dir = git.git(["-C", home, "rev-parse", "--git-path", "hooks"])?.trim();
    const file = dir ? resolve(home, dir, hook) : null;
    if (!file || !isExecutable(file)) return null;
    r = spawnSync(file, args, opts);
  }
  if (r.status === 0) return null;
  const lines = `${r.stderr ?? ""}\n${r.stdout ?? ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines[0] ?? `exited with ${r.status ?? r.signal}`;
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Whether the project's pre-commit and commit-msg hooks would let the hub commit on the base branch, without committing:
 * a temporary index (HEAD plus one blob at .crew/.doctor-probe) and a temporary message, both under the git common dir,
 * removed afterwards. Null when both hooks accept, else which one refused and its first line. */
export function probeHubCommit(home: string): { hook: string; message: string } | null {
  const common = git.commonDir(home);
  if (!common) return null;
  const dir = join(common, "crew");
  mkdirSync(dir, { recursive: true });
  const index = join(dir, `doctor-index-${process.pid}`), msg = join(dir, `doctor-msg-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  const g = (args: string[], input?: string) =>
    spawnSync("git", ["-C", home, ...args], { env, input, encoding: "utf8" });
  try {
    if (g(["rev-parse", "--verify", "-q", "HEAD"]).status === 0) g(["read-tree", "HEAD"]);
    else g(["read-tree", "--empty"]);
    const existing = g(["ls-tree", "-r", "HEAD", "--", ".crew"]).stdout?.split("\n").find((l) => / blob /.test(l));
    const blob = existing?.split(/\s+/)[2] ?? g(["hash-object", "-w", "--stdin"], "").stdout.trim();
    g(["update-index", "--add", "--cacheinfo", `100644,${blob},.crew/.doctor-probe`]);
    const pre = runHook(home, "pre-commit", [], env);
    if (pre !== null) return { hook: "pre-commit", message: pre };
    writeFileSync(msg, "chore(hub): doctor probe\n");
    const cm = runHook(home, "commit-msg", [msg], env);
    return cm === null ? null : { hook: "commit-msg", message: cm };
  } finally {
    for (const f of [index, `${index}.lock`, msg]) rmSync(f, { force: true });
  }
}
