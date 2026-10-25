/** `refresh-bin [--check]` (FEAT-027, P-024): Release refreshes the vendored hub in a plan worktree's .crew/bin from the
 * policy's `release.refresh_bin`; every other way into .crew/bin stays denied by the guard. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { Repo } from "../helpers/repo.js";
import { init, newPlan, tr } from "./e2e/helpers.js";
import { agent, bash, hook } from "./e2e/sections.js";

const KEY = "release:\n  refresh_bin:\n    from: vendor/dist\n    files: [crew.mjs, ui.html]\n";
const policy = (repo: Repo, extra = KEY) => repo.write(".crew/policy.yaml", `mode: ai-native\n${extra}`);
const as = (r: Repo, role: string, ...args: string[]) => tr(r, "--as", role, ...args);

/** A plan-worktree hub whose .crew/bin holds old crew.mjs (0755) and ui.html, no studio.html, and a `from` dir holding
 * new crew.mjs, ui.html and studio.html. Returns the main checkout and P-001's worktree. */
function setup(): { repo: Repo; wt: Repo } {
  const repo = Repo.create();
  init(repo, { commit: true });
  repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  for (const f of readdirSync(join(repo.path, ".crew/bin"))) repo.git("rm", "-q", "-r", "--cached", "--ignore-unmatch", `.crew/bin/${f}`);
  repo.run("rm", ["-rf", join(repo.path, ".crew/bin")]);
  repo.write(".crew/bin/crew.mjs", "// old hub\n", 0o755);
  repo.write(".crew/bin/ui.html", "<p>old ui</p>\n");
  repo.write("vendor/dist/crew.mjs", "// new hub\n", 0o644);
  repo.write("vendor/dist/ui.html", "<p>new ui</p>\n");
  repo.write("vendor/dist/studio.html", "<p>studio</p>\n");
  repo.commit("chore: vendored hub");
  expect(newPlan(repo, "Signup").returncode).toBe(0);
  const dir = join(repo.path, ".claude/worktrees");
  const wt = new Repo(join(dir, readdirSync(dir).find((f) => f.startsWith("P-001-"))!));
  wt.env = repo.env;
  policy(repo);
  return { repo, wt };
}

const bin = (r: Repo, f: string) => readFileSync(join(r.path, ".crew/bin", f));
const src = (r: Repo, f: string) => readFileSync(join(r.path, "vendor/dist", f));
const snapshot = (r: Repo) => ["crew.mjs", "ui.html"].map((f) => bin(r, f).toString()).join("|");

it("refresh-bin as release makes the listed .crew/bin files byte-identical and adds none (AC1)", () => {
  const { wt } = setup();
  const r = as(wt, "release", "refresh-bin");
  expect(r.returncode, r.stderr).toBe(0);
  for (const f of ["crew.mjs", "ui.html"]) {
    expect(bin(wt, f).equals(src(wt, f)), f).toBe(true);
    expect(r.stdout).toContain(`refreshed .crew/bin/${f} from vendor/dist/${f}`);
  }
  expect(r.stdout.match(/^refreshed /gm)).toHaveLength(2);
  expect(statSync(join(wt.path, ".crew/bin/crew.mjs")).mode & 0o777).toBe(0o755); // the target keeps its mode
  expect(existsSync(join(wt.path, ".crew/bin/studio.html"))).toBe(false);
  const again = as(wt, "release", "refresh-bin");
  expect(again.returncode).toBe(0);
  expect(again.stdout).toContain("up to date");
  expect(again.stdout).not.toContain("refreshed ");
});

it("a listed file missing from .crew/bin is never created (AC1)", () => {
  const { repo, wt } = setup();
  policy(repo, "release:\n  refresh_bin:\n    from: vendor/dist\n    files: [crew.mjs, studio.html]\n");
  const r = as(wt, "release", "refresh-bin");
  expect(r.returncode, r.stderr).toBe(0);
  expect(existsSync(join(wt.path, ".crew/bin/studio.html"))).toBe(false);
  expect(bin(wt, "ui.html").toString()).toBe("<p>old ui</p>\n"); // not listed
  expect(bin(wt, "crew.mjs").equals(src(wt, "crew.mjs"))).toBe(true);
});

it("refresh-bin refuses another role, a missing key and the base checkout, writing nothing (AC2)", () => {
  const { repo, wt } = setup();
  const before = snapshot(wt);
  let r = as(wt, "developer", "refresh-bin");
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain("only the release role");
  expect(snapshot(wt)).toBe(before);
  r = as(repo, "release", "refresh-bin");
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain("not a plan's worktree");
  expect(bin(repo, "crew.mjs").toString()).toBe("// old hub\n");
  policy(repo, "");
  r = as(wt, "release", "refresh-bin");
  expect(r.returncode).toBe(1);
  expect(r.stderr).toContain("release.refresh_bin");
  expect(snapshot(wt)).toBe(before);
});

it("refresh-bin refuses a from outside the checkout or under .crew/, and file names that aren't bare (AC2)", () => {
  const { repo, wt } = setup();
  const before = snapshot(wt);
  for (const [from, files] of [["/abs", "[crew.mjs]"], ["../x", "[crew.mjs]"], [".crew/bin", "[crew.mjs]"],
    ["vendor/../.crew", "[crew.mjs]"], ["vendor/dist", "[../policy.yaml]"], ["vendor/dist", "[crew.mjs, .hidden]"],
    ["vendor/dist", "[sub/crew.mjs]"]]) {
    policy(repo, `release:\n  refresh_bin:\n    from: ${from}\n    files: ${files}\n`);
    const r = as(wt, "release", "refresh-bin");
    expect(r.returncode, `${from} ${files}`).toBe(1);
    expect(r.stderr, `${from} ${files}`).toContain("refresh-bin:");
    expect(snapshot(wt), `${from} ${files}`).toBe(before);
  }
});

it("the guard still denies a Release subagent's direct copy or edit into .crew/bin (AC2)", () => {
  const { repo } = setup();
  agent(repo, "crew-release", "release");
  for (const payload of [bash("crew-release", "cp vendor/dist/crew.mjs .crew/bin/crew.mjs"),
    { tool_name: "Edit", agent_type: "crew-release", agent_id: "a1", tool_input: { file_path: ".crew/bin/crew.mjs" } }]) {
    const out = hook(repo, payload);
    expect(out?.permissionDecision).toBe("deny");
    expect(out.permissionDecisionReason).toContain("paths.protected");
  }
});

it("policy check reports release: under a role or team as global-only (AC2)", () => {
  const { repo } = setup();
  policy(repo, "roles:\n  release:\n    release:\n      refresh_bin: {from: vendor/dist, files: [crew.mjs]}\n"
    + "teams:\n  web:\n    release:\n      refresh_bin: {from: vendor/dist, files: [crew.mjs]}\n");
  const r = tr(repo, "policy", "check");
  expect(r.returncode).toBe(1);
  const out = r.stdout + r.stderr;
  expect(out).toContain("roles.release.release: can only be set globally");
  expect(out).toContain("teams.web.release: can only be set globally");
});

it("policy show prints the effective release.refresh_bin (AC5)", () => {
  const { repo } = setup();
  const r = tr(repo, "policy", "show");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).toMatch(/release\.refresh_bin\.from\s+vendor\/dist\s+\(project\)/);
  expect(r.stdout).toMatch(/release\.refresh_bin\.files\s+crew\.mjs, ui\.html\s+\(project\)/);
  const j = JSON.parse(tr(repo, "policy", "show", "--json").stdout);
  expect(j.policy.release.refresh_bin).toEqual({ from: "vendor/dist", files: ["crew.mjs", "ui.html"] });
  policy(repo, "");
  const none = tr(repo, "policy", "show");
  expect(none.stdout).toMatch(/release\.refresh_bin\.from\s+none/);
  expect(none.stdout).toMatch(/release\.refresh_bin\.files\s+none/);
  expect(JSON.parse(tr(repo, "policy", "show", "--json").stdout).policy.release.refresh_bin).toEqual({ from: null, files: [] });
});

it("refresh-bin --check exits 1 naming stale files, 0 once they match, 0 with no key (AC3)", () => {
  const { repo, wt } = setup();
  let r = tr(wt, "refresh-bin", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("stale: .crew/bin/crew.mjs");
  expect(r.stdout).toContain("stale: .crew/bin/ui.html");
  expect(snapshot(wt)).toContain("old hub"); // read-only
  expect(as(wt, "release", "refresh-bin").returncode).toBe(0);
  r = tr(wt, "refresh-bin", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).not.toContain("stale:");
  policy(repo, "");
  r = tr(repo, "refresh-bin", "--check");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("nothing to check");
});
