/** `run --until-done` (P-034): the local runner's preflight (AC1–AC3), its loop, pass reports and stop reasons (AC4–AC7,
 * AC9) and the `stopped` notification (AC8). No test runs `claude`: every loop passes `--command`. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { HUB, PLUGIN, Repo } from "../../helpers/repo.js";
import { init, newGoal, newIdea, tr } from "./helpers.js";
import { events } from "./sections.js";
import { as } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const SETTINGS = readFileSync(join(PLUGIN, "skills/guidelines/templates/settings.json"), "utf8");
const ok = (r: { returncode: number; stderr: string }) => expect(r.returncode, r.stderr).toBe(0);
const until = (...args: string[]) => tr(repo, "run", "--until-done", ...args);
const runnerReports = () => events(repo, "--type", "report").filter((e) => e.source === "runner");

/** Rendered agents and the template's hooks; settings.json edited by `edit`. */
function setUp(edit: (s: any) => void = () => {}): void { // eslint-disable-line @typescript-eslint/no-explicit-any
  ok(tr(repo, "agents"));
  const s = JSON.parse(SETTINGS);
  edit(s);
  repo.write(".claude/settings.json", JSON.stringify(s, null, 2));
}

/** A set-up project with G-001 active and focused: work to dispatch. */
function focused(): void {
  init(repo, { commit: true });
  setUp();
  ok(newIdea(repo));
  ok(newGoal(repo));
  ok(tr(repo, "move", "G-001", "active", "--approved-by", "Amit"));
  ok(tr(repo, "focus", "G-001"));
}

describe("preflight", () => {
  it("no rendered agents: PREFLIGHT names them and `crew.mjs agents`, exit 2, nothing runs or is recorded (AC1)", () => {
    init(repo, { commit: true });
    const before = events(repo).length;
    const r = until("--command", "touch ran");
    expect(r.returncode, r.stderr).toBe(2);
    expect(r.stdout).toMatch(/^PREFLIGHT {2}crew agents not rendered.*crew-developer\.md \(missing\).*`crew\.mjs agents`/m);
    expect(existsSync(join(repo.path, "ran"))).toBe(false);
    expect(events(repo).length).toBe(before);
  });

  it("an agent whose front matter doesn't parse, or whose name isn't its file name, is named (AC2)", () => {
    init(repo, { commit: true });
    setUp();
    const pm = repo.read(".claude/agents/crew-pm.md");
    repo.write(".claude/agents/crew-pm.md", pm.replace(/^description: .*$/m, "description: a: b"));
    let r = until("--command", "touch ran");
    expect(r.returncode).toBe(2);
    expect(r.stdout).toMatch(/^PREFLIGHT {2}\.claude\/agents\/crew-pm\.md won't load: front matter doesn't parse/m);
    repo.write(".claude/agents/crew-pm.md", pm.replace(/^name: .*$/m, "name: crew-product"));
    r = until("--command", "touch ran");
    expect(r.returncode).toBe(2);
    expect(r.stdout).toMatch(/^PREFLIGHT {2}\.claude\/agents\/crew-pm\.md won't load: its name 'crew-product' differs/m);
    expect(existsSync(join(repo.path, "ran"))).toBe(false);
  });

  it("no guard hook fails; no activity hook only warns, and passes run (AC3)", () => {
    focused();
    setUp((s) => { s.hooks.PreToolUse = []; });
    let r = until("--command", "touch ran");
    expect(r.returncode).toBe(2);
    expect(r.stdout).toMatch(/^PREFLIGHT {2}the guard hook \(PreToolUse `crew\.mjs guard`\)/m);
    setUp((s) => { s.hooks.PostToolUse = s.hooks.PostToolUse.filter((g: any) => g.matcher !== "*"); }); // eslint-disable-line @typescript-eslint/no-explicit-any
    r = until("--command", "touch ran", "--max-passes", "1");
    expect(r.stdout.split("\n").filter((l) => l.startsWith("WARN"))).toEqual([expect.stringContaining("the activity hook")]);
    expect(r.stdout).not.toContain("PREFLIGHT");
    expect(existsSync(join(repo.path, "ran"))).toBe(true);
  });

  it("a pass command that isn't on PATH fails (preflight)", () => {
    focused();
    const r = until("--command", "no-such-crew-command --x");
    expect(r.returncode).toBe(2);
    expect(r.stdout).toContain("PREFLIGHT  the pass command 'no-such-crew-command' is not on PATH");
  });
});

describe("loop", () => {
  it("runs passes until the team pauses, one runner report per pass, then the stop (AC4)", () => {
    focused();
    ok(as(repo, "developer", "new-item", "feat", "Remember me", "--why", "a reason", "--goal", "G-001"));
    ok(as(repo, "developer", "new-item", "feat", "Magic link", "--why", "a reason", "--goal", "G-001"));
    repo.write("pass.mjs", [
      'import { execFileSync } from "node:child_process";',
      "const hub = process.argv[2];",
      'const d = JSON.parse(execFileSync("node", [hub, "dispatch", "--json"], { encoding: "utf8" }));',
      'const t = d.entries.find((e) => e.task.startsWith("triage "));',
      'if (t) execFileSync("node", [hub, "--as", "pm", "triage", t.ref, "--priority", "P2"]);',
      'else execFileSync("node", [hub, "pause", "--reason", "script done"]);',
    ].join("\n"));
    const r = until("--command", `node pass.mjs "${HUB}"`);
    expect(r.returncode, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/^STOP {2}paused by .*: script done$/m);
    expect(r.stdout).toMatch(/^passes: 3, ledger events: \d+$/m);
    const reports = runnerReports();
    expect(reports.slice(0, 3).map((e) => [e.pass, e.exit, e.progress])).toEqual([[1, 0, 1], [2, 0, 1], [3, 0, 1]]);
    for (const e of reports.slice(0, 3)) expect(e.dispatched).toBeGreaterThan(0);
    expect(reports[3]).toMatchObject({ stopped: expect.stringContaining("script done"), passes: 3 });
    expect(reports).toHaveLength(4);
  });

  it("a command that changes nothing stops after exactly 2 passes, exit 1 (AC5)", () => {
    focused();
    const r = until("--command", "true");
    expect(r.returncode).toBe(1);
    expect(r.stdout).toMatch(/^STOP {2}no progress in 2 passes$/m);
    expect(runnerReports().map((e) => e.pass ?? "stop")).toEqual([1, 2, "stop"]);
  });

  it("--max-passes 1 with work left runs one pass and stops at the limit, exit 1 (AC6)", () => {
    focused();
    const r = until("--command", "true", "--max-passes", "1");
    expect(r.returncode).toBe(1);
    expect(r.stdout).toMatch(/^STOP {2}max passes \(1\)$/m);
    expect(runnerReports().map((e) => e.pass ?? e.stopped)).toEqual([1, "max passes (1)"]);
  });

  it("a paused team: no pass, the pause reason, exit 0 (AC7)", () => {
    focused();
    ok(tr(repo, "pause", "--reason", "lunch"));
    const r = until("--command", "touch ran");
    expect(r.returncode).toBe(0);
    expect(r.stdout).toMatch(/^STOP {2}paused by .*: lunch$/m);
    expect(r.stdout).not.toContain("PASS");
    expect(existsSync(join(repo.path, "ran"))).toBe(false);
  });

  it("a crew agent can't start the runner (AC9)", () => {
    focused();
    const before = events(repo).length;
    const r = as(repo, "developer", "run", "--until-done", "--command", "touch ran");
    expect(r.returncode).toBe(1);
    expect(r.stderr).toContain("started by a human");
    expect(existsSync(join(repo.path, "ran"))).toBe(false);
    expect(events(repo).length).toBe(before);
  });
});

describe("notify", () => {
  it("a run sends exactly one `stopped` notification with the reason; policy check accepts it (AC8)", () => {
    focused();
    repo.write(".crew/policy.yaml", 'mode: ai-native\nnotify: { command: "cat >> notified.jsonl", on: [stopped] }\n');
    expect(tr(repo, "policy", "check").stdout).toContain("Policy OK.");
    expect(until("--command", "true").returncode).toBe(1);
    const sent = repo.read("notified.jsonl").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ kind: "stopped", text: "no progress in 2 passes after 2 passes" });
  });
});
