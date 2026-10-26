/** The hub, end to end — `doctor` (is a project ready for the autonomous loop), `init`'s default config and policy, and the
 * hub commit's failure message when a git hook refuses it (P-036). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo, SKILLS } from "../../helpers/repo.js";
import { newBug, tr } from "./helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const GITHOOKS = join(SKILLS, "git-setup", "assets", "githooks");
const SETTINGS = readFileSync(join(SKILLS, "guidelines", "templates", "settings.json"), "utf8");
const CONFIG = "git:\n  default_branch: main\nhub:\n  plan_worktrees: true\n  build: echo build\n  shared: [src/registry.ts]\n";
const NO_MAIN = "#!/bin/sh\n[ \"$(git symbolic-ref --short HEAD)\" = main ] && { echo \"hook: no commits on main\" >&2; exit 1; }\nexit 0\n";
const NO_HUB_MSG = "#!/bin/sh\ngrep -q '^chore(hub)' \"$1\" && { echo \"hook: no hub commits\" >&2; exit 1; }\nexit 0\n";

type Check = { id: string; level: string; detail: string; fix: string | null };
const doctorJson = (r: Repo = repo): Check[] => JSON.parse(tr(r, "doctor", "--json").stdout).checks;
const level = (id: string) => doctorJson().filter((c) => c.id === id).map((c) => c.level);
const lineFor = (out: string, id: string) => out.split("\n").filter((l) => l.includes(` ${id}: `));

/** A repo set up for the loop: base main, plan worktrees, rendered agents, the guidelines' settings.json, a hub.build with
 * one linguist-generated file, hub.shared, `preset: lifecycle`, and crew's git-setup hooks under core.hooksPath. */
function loopRepo(): void {
  repo.git("commit", "-q", "--allow-empty", "-m", "init");
  expect(tr(repo, "init").returncode).toBe(0);
  repo.write(".crew/config.yaml", CONFIG);
  repo.write(".crew/policy.yaml", "preset: lifecycle\n");
  expect(tr(repo, "agents").returncode).toBe(0);
  repo.write(".claude/settings.json", SETTINGS);
  repo.write(".gitattributes", "gen/out.js linguist-generated\n");
  repo.write("gen/out.js", "// built\n");
  for (const f of readdirSync(GITHOOKS)) repo.write(`.githooks/${f}`, readFileSync(join(GITHOOKS, f), "utf8"), 0o755);
  repo.commit("chore: set up the loop");
  repo.git("config", "core.hooksPath", ".githooks");
}

const snapshot = () => ({ status: repo.git("status", "--porcelain", "--untracked-files=all").stdout,
  head: repo.git("rev-parse", "HEAD").stdout });

it("hooks: hub-commits is OK with crew's git-setup hooks and leaves the repo as it was (AC5)", () => {
  loopRepo();
  const before = snapshot();
  expect(level("hub-commits")).toEqual(["ok"]);
  expect(snapshot()).toEqual(before);
  expect(readdirSync(join(repo.path, ".git", "crew")).filter((f) => f.startsWith("doctor-"))).toEqual([]);
});

it("hooks: hub-commits FAILs when the pre-commit refuses every commit on main (AC5)", () => {
  loopRepo();
  repo.write(".githooks/pre-commit", NO_MAIN, 0o755);
  repo.commit("chore: strict hooks");
  const before = snapshot();
  const r = tr(repo, "doctor");
  expect(r.returncode).toBe(1);
  const [line] = lineFor(r.stdout, "hub-commits");
  expect(line).toMatch(/^FAIL {2}hub-commits: pre-commit refuses a hub commit on main: hook: no commits on main → /);
  expect(line).toContain("allow commits on main whose staged paths are all under .crew/ in your pre-commit");
  expect(snapshot()).toEqual(before);
  expect(readdirSync(join(repo.path, ".git", "crew")).filter((f) => f.startsWith("doctor-"))).toEqual([]);
});

it("hooks: hub-commits FAILs when the commit-msg hook rejects chore(hub) (AC5)", () => {
  loopRepo();
  repo.write(".githooks/commit-msg", NO_HUB_MSG, 0o755);
  repo.commit("chore: strict hooks");
  const before = snapshot();
  const c = doctorJson().find((x) => x.id === "hub-commits")!;
  expect(c.level).toBe("fail");
  expect(c.detail).toContain("commit-msg refuses a hub commit on main: hook: no hub commits");
  expect(snapshot()).toEqual(before);
});

it("doctor: a repo set up for the loop is all OK (AC1)", () => {
  loopRepo();
  const r = tr(repo, "doctor");
  expect(r.returncode, r.stdout).toBe(0);
  const lines = r.stdout.split("\n").filter(Boolean);
  expect(lines.every((l) => l.startsWith("OK  ")), r.stdout).toBe(true);
  const checks = doctorJson();
  expect(checks.map((c) => c.id)).toEqual(["base-branch", "main-checkout", "plan-worktrees", "vendored-hub", "agents",
    "hooks", "generated", "shared", "policy", "hub-commits"]);
  expect(checks.every((c) => c.level === "ok")).toBe(true);
});

it("doctor: main-checkout and base-branch FAIL off the base (AC2)", () => {
  loopRepo();
  repo.git("switch", "-q", "-c", "elsewhere");
  const r = tr(repo, "doctor");
  expect(r.returncode).toBe(1);
  expect(lineFor(r.stdout, "main-checkout")[0]).toMatch(/^FAIL {2}main-checkout: .* is on elsewhere, not main → /);
  repo.git("switch", "-q", "main");
  repo.write(".crew/config.yaml", CONFIG.replace("default_branch: main", "default_branch: trunk"));
  expect(level("base-branch")).toEqual(["fail"]);
  expect(tr(repo, "doctor").returncode).toBe(1);
});

it("doctor: hooks and agents report what's missing (AC3)", () => {
  loopRepo();
  const settings = JSON.parse(SETTINGS);
  delete settings.hooks.PostToolUse;
  repo.write(".claude/settings.json", JSON.stringify(settings));
  expect(level("hooks")).toEqual(["warn"]);
  expect(tr(repo, "doctor").returncode).toBe(0);
  delete settings.hooks.PreToolUse;
  repo.write(".claude/settings.json", JSON.stringify(settings));
  expect(level("hooks").sort()).toEqual(["fail", "warn"]);
  expect(tr(repo, "doctor").returncode).toBe(1);
  repo.git("rm", "-q", "-r", ".claude/agents");
  const agents = doctorJson().filter((c) => c.id === "agents");
  expect(agents.length).toBeGreaterThan(0);
  expect(agents.every((c) => c.level === "warn" && c.fix!.includes("crew.mjs agents"))).toBe(true);
});

it("doctor: generated, shared and policy WARN or FAIL (AC4)", () => {
  loopRepo();
  repo.write(".gitattributes", "");
  expect(level("generated")).toEqual(["warn"]);
  repo.write(".crew/config.yaml", CONFIG.replace("  shared: [src/registry.ts]\n", ""));
  expect(level("shared")).toEqual(["warn"]);
  repo.write(".crew/config.yaml", CONFIG.replace("[src/registry.ts]", "\"x\""));
  expect(level("shared")).toEqual(["fail"]);
  repo.write(".crew/policy.yaml", "mode: ai-native\n");
  const policy = doctorJson().find((c) => c.id === "policy")!;
  expect(policy.level).toBe("warn");
  expect(policy.detail).toContain("preset: lifecycle");
  expect(policy.detail).toContain("yours");
});

it("doctor: the MCP tool returns doctor --json, and help lists it (AC8)", () => {
  loopRepo();
  const mcp = join(SKILLS, "hub", "dist", "mcp.mjs");
  const input = [{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "doctor", arguments: {} } }].map((m) => JSON.stringify(m)).join("\n") + "\n";
  const r = repo.node(mcp, [], input);
  const reply = r.stdout.split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((m) => m.id === 2);
  expect(JSON.parse(reply.result.content[0].text)).toEqual(JSON.parse(tr(repo, "doctor", "--json").stdout));
  expect(tr(repo, "help").stdout).toContain("doctor [--json]");
});

it("init writes default config and policy once, and keeps existing ones (AC6)", () => {
  repo.git("switch", "-q", "-c", "trunk");
  const r = tr(repo, "init");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).toContain("Wrote .crew/config.yaml");
  expect(r.stdout).toContain("Wrote .crew/policy.yaml");
  const config = repo.read(".crew/config.yaml"), policy = repo.read(".crew/policy.yaml");
  expect(config).toMatch(/^ {2}default_branch: trunk$/m);
  expect(config).toMatch(/^ {2}plan_worktrees: true$/m);
  expect(policy).toMatch(/^# preset: lifecycle$/m);
  expect(policy).not.toMatch(/^preset:/m);
  expect(tr(repo, "policy", "check").returncode).toBe(0);
  const again = tr(repo, "init");
  expect(again.stdout).not.toContain("Wrote .crew/");
  expect([repo.read(".crew/config.yaml"), repo.read(".crew/policy.yaml")]).toEqual([config, policy]);

  const other = Repo.create();
  other.write(".crew/config.yaml", "hub:\n  wip_limit: 3\n");
  other.write(".crew/policy.yaml", "mode: ai-native # mine\n");
  expect(tr(other, "init").returncode).toBe(0);
  expect([other.read(".crew/config.yaml"), other.read(".crew/policy.yaml")]).toEqual(["hub:\n  wip_limit: 3\n", "mode: ai-native # mine\n"]);
});

it("init outside git leaves plan_worktrees off, so the next hub write works (BUG-032)", () => {
  const plain = Repo.create(false);
  plain.env = repo.env;
  const r = tr(plain, "init");
  expect(r.returncode, r.stderr).toBe(0);
  expect(plain.read(".crew/config.yaml")).toMatch(/^ {2}plan_worktrees: false$/m);
  expect(tr(plain, "pause").returncode).toBe(0);
});

it("a refused hub commit message names the hook's refusal and doctor (AC7)", () => {
  loopRepo();
  repo.write(".githooks/pre-commit", NO_MAIN, 0o755);
  repo.commit("chore: strict hooks");
  const head = repo.git("rev-parse", "HEAD").stdout;
  const r = newBug(repo, "Crash");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("hook: no commits on main");
  expect(r.stderr).toContain("`crew.mjs doctor`");
  expect(readdirSync(join(repo.path, ".crew/items")).some((f) => f.startsWith("BUG-001-"))).toBe(true);
  expect(repo.git("rev-parse", "HEAD").stdout).toBe(head);
});
