/** The hub, end to end — `suite` and `suites` (P-043, BUG-028): full suites take one of `hub.suite_slots` slots shared
 * by every worktree, a dead holder's slot is taken over, and each run is recorded with its wait and duration. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo, type Result } from "../../helpers/repo.js";
import { init, tr } from "./helpers.js";
import { mcpCall } from "./sections.js";

let repo: Repo;
beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true });
});

const config = (lines: string) => repo.write(".crew/config.yaml", `hub:\n${lines}`);
const SLOW = "  full_suite: echo s >> runs.log; sleep 3; echo e >> runs.log\n";
const suiteDir = () => join(repo.path, ".git/crew/suite");
const runsLog = () => repo.read("runs.log").split("\n").filter(Boolean);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const records = (...args: string[]): any[] => JSON.parse(tr(repo, "suites", "--json", ...args).stdout);

/** `suite --ref <ref>` in the background, after `delay` ms. */
function bg(ref: string, delay = 0): Promise<Result> {
  return new Promise((done) => setTimeout(() => {
    const p = spawn("node", [HUB, "suite", "--ref", ref], { cwd: repo.path, env: repo.env });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => { stdout += d; });
    p.stderr.on("data", (d) => { stderr += d; });
    p.on("close", (code) => done({ returncode: code ?? -1, stdout, stderr }));
  }, delay));
}

it("one slot by default: a second suite waits, says so once, and starts after the first ends", async () => {
  config(SLOW);
  const [first, second] = await Promise.all([bg("P-001"), bg("P-002", 500)]);
  expect([first.returncode, second.returncode]).toEqual([0, 0]);
  expect(runsLog()).toEqual(["s", "e", "s", "e"]);
  expect(first.stderr).not.toContain("waiting");
  expect(second.stderr.match(/suite: waiting for a slot/g)).toHaveLength(1);
  expect(second.stderr).toMatch(/held by \S+ \(P-001, since \d{4}-\d\d-\d\dT/);
  expect(records().find((r) => r.ref === "P-002").wait_ms).toBeGreaterThan(1000);
  expect(readdirSync(suiteDir())).toEqual([]);
});

it("suite_slots 2: two suites overlap and a third waits for a slot", async () => {
  config(`${SLOW}  suite_slots: 2\n`);
  const [, , third] = await Promise.all([bg("P-001"), bg("P-002"), bg("P-003", 500)]);
  expect(runsLog()).toEqual(["s", "s", "e", "e", "s", "e"]);
  expect(third.stderr).toContain("suite: waiting for a slot");
  expect(records().map((r) => r.slot).sort()).toEqual([0, 0, 1]);
});

it("a stale slot left by a dead process is taken over at once", () => {
  config("  full_suite: true\n");
  const dead = spawnSync("node", ["-e", ""]).pid;
  repo.write(".git/crew/suite/slot-0.lock", JSON.stringify({ token: "gone", pid: dead, host: hostname(), run: "dead-run",
    ref: "P-009", worktree: repo.path, started: "2026-10-25T00:00:00.000Z" }));
  const r = tr(repo, "suite");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stderr).not.toContain("waiting");
  expect(records()[0].wait_ms).toBeLessThan(1000);
  expect(readdirSync(suiteDir())).toEqual([]);
});

it("a live holder's slot is not stale, however old", () => {
  config("  full_suite: true\n");
  repo.write(".git/crew/suite/slot-0.lock", JSON.stringify({ token: "live", pid: process.pid, host: hostname(), run: "me",
    ref: null, worktree: repo.path, started: "2026-01-01T00:00:00.000Z" }));
  const p = spawnSync("node", [HUB, "suite"], { cwd: repo.path, env: repo.env, encoding: "utf8", timeout: 2500 });
  expect(p.stderr).toContain("suite: waiting for a slot — held by me (no ref, since 2026-01-01");
  expect(existsSync(join(suiteDir(), "slot-0.lock"))).toBe(true);
});

it("suite exits with the suite's exit code and records it", () => {
  config("  full_suite: exit 3\n");
  const r = tr(repo, "suite", "--ref", "p-004");
  expect(r.returncode).toBe(3);
  expect(r.stdout).toContain("suite: exit 3");
  expect(records()[0]).toMatchObject({ ref: "P-004", exit: 3 });
});

it("no full_suite or a bad suite_slots fails at exit 1 without a slot or a record", () => {
  for (const [lines, message] of [["  wip_limit: 3\n", "No hub.full_suite in .crew/config.yaml."],
    ["  full_suite: true\n  suite_slots: 0\n", "hub.suite_slots: expected a whole number of at least 1"],
    ["  full_suite: true\n  suite_slots: two\n", "hub.suite_slots: expected a whole number of at least 1"]]) {
    config(lines);
    const r = tr(repo, "suite");
    expect([r.returncode, r.stderr.trim()]).toEqual([1, message]);
    expect(existsSync(suiteDir())).toBe(false);
    expect(existsSync(join(repo.path, ".git/crew/suites.jsonl"))).toBe(false);
  }
});

it("suites lists each run's record newest first, with --limit, the text form and the MCP tool", () => {
  config("  full_suite: true\n");
  const help = tr(repo, "help").stdout;
  expect(help).toMatch(/^  suite \[--ref P-###\] /m);
  expect(help).toMatch(/^  suites \[--limit 20\] \[--json\] /m);
  expect(tr(repo, "suites").stdout.trim()).toBe("No suite runs recorded.");
  expect(tr(repo, "suite", "--ref", "P-001").returncode).toBe(0);
  writeFileSync(join(repo.path, ".git/crew/suites.jsonl"), `${repo.read(".git/crew/suites.jsonl")}{"torn":`);
  expect(tr(repo, "suite", "--ref", "P-002").returncode).toBe(0);
  const all = records();
  expect(all.map((r) => r.ref)).toEqual(["P-002", "P-001"]);
  for (const r of all) {
    expect(Object.keys(r)).toEqual(["ts", "ref", "run", "worktree", "slot", "wait_ms", "run_ms", "exit"]);
    expect(r).toMatchObject({ run: expect.stringMatching(/^wt:/), worktree: realpathSync(repo.path), slot: 0, exit: 0 });
  }
  expect(records("--limit", "1").map((r) => r.ref)).toEqual(["P-002"]);
  const text = tr(repo, "suites").stdout.trim().split("\n");
  expect(text).toHaveLength(2);
  expect(text[0]).toMatch(/^\S+ {2}P-002 {2}wt:\S+ {2}slot 0 {2}waited \d+\.\ds {2}ran \d+\.\ds {2}exit 0$/);
  const res = mcpCall(repo, "suites", { limit: 1 });
  expect(res.isError).toBeFalsy();
  expect(JSON.parse(res.content[0].text)).toEqual(records("--limit", "1"));
});
