/** Live agent activity, end to end on the built bundle: the PostToolUse hook's feed (AC1–AC3), the agent's final report on
 * SubagentStop (AC5), "Running now" in `status` with idle runs (AC6, AC7) and `watch` (AC8). */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { finish, init, tr } from "./helpers.js";
import { agent, events, readyPlan } from "./sections.js";

let repo: Repo;
const feed = () => join(repo.path, ".git/crew/activity.jsonl");
const ledger = () => join(repo.path, ".git/crew/ledger.jsonl");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lines = (): any[] => (existsSync(feed()) ? readFileSync(feed(), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);
const activity = (payload: object | string) =>
  repo.run("node", [HUB, "activity", "--hook"], typeof payload === "string" ? payload : JSON.stringify(payload));
const call = (tool: string, input: object, extra: object = {}) =>
  ({ hook_event_name: "PostToolUse", agent_type: "crew-developer", agent_id: "a1", tool_name: tool, tool_input: input, cwd: repo.path, ...extra });
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const put = (path: string, rows: object[]) => {
  mkdirSync(join(repo.path, ".git/crew"), { recursive: true });
  appendFileSync(path, rows.map((r) => `${JSON.stringify(r)}\n`).join(""));
};
const act = (minutes: number, over: object = {}) =>
  ({ ts: ago(minutes), run: "developer:a1", role: "developer", ref: "P-001", tool: "Edit", target: "src/a.ts", ...over });
const led = (minutes: number, type: string, over: object = {}) =>
  ({ ts: ago(minutes), type, ref: "P-001", run: "developer:a1", actor: "dev", role: "developer", team: null, worktree: repo.path, ...over });

beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true });
  agent(repo, "crew-developer", "developer");
  agent(repo, "Explore", null);
});

describe("activity --hook", () => {
  it("appends one line per crew agent tool call and prints nothing", () => {
    const r = activity(call("Edit", { file_path: join(repo.path, "src/a.ts"), old_string: "a", new_string: "b" }));
    expect([r.returncode, r.stdout, r.stderr]).toEqual([0, "", ""]);
    const [e] = lines();
    expect(Object.keys(e).sort()).toEqual(["ref", "role", "run", "target", "tool", "ts"]);
    expect(e).toMatchObject({ run: "developer:a1", role: "developer", ref: null, tool: "Edit", target: "src/a.ts" });
    expect(existsSync(ledger())).toBe(false);
  });

  it("writes nothing for other agents, the main session or a bad payload", () => {
    for (const p of [call("Bash", { command: "ls" }, { agent_type: "Explore" }), { tool_name: "Bash", tool_input: { command: "ls" } }, "{not json", ""]) {
      const r = activity(p);
      expect([r.returncode, r.stdout]).toEqual([0, ""]);
    }
    expect(lines()).toEqual([]);
  });

  it("stores no arguments", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB", url = "https://example.com/private?q=1";
    activity(call("Bash", { command: `curl -H "x-token: ${secret}" ${url}` }));
    activity(call("Write", { file_path: join(repo.path, "notes.txt"), content: "the file body" }));
    activity(call("Grep", { pattern: "some-needle-pattern", path: repo.path }));
    const text = readFileSync(feed(), "utf8");
    for (const s of [secret, url, "example.com", "the file body", "some-needle-pattern"]) expect(text).not.toContain(s);
    expect(lines().map((e) => [e.tool, e.target])).toEqual([["Bash", "curl"], ["Write", "notes.txt"], ["Grep", null]]);
  });

  it("takes the ref from the hub command, else the worktree, else the run's previous event", () => {
    activity(call("Bash", { command: "node .crew/bin/crew.mjs --as developer --run-id developer:a1 checkpoint P-004 --step T1" }));
    activity(call("Bash", { command: "npm test" })); // nothing in the call: the previous ref
    activity(call("Read", { file_path: join(repo.path, ".claude/worktrees/P-007-x/src/b.ts") }));
    activity(call("Bash", { command: "ls" }, { agent_id: "other" })); // a new run with nothing to go on
    expect(lines().map((e) => [e.target, e.ref])).toEqual([["crew.mjs checkpoint", "P-004"], ["npm", "P-004"], ["src/b.ts", "P-007"], ["ls", null]]);
  });
});

describe("usage --hook records the agent's report", () => {
  const stop = (transcript: object[]) => {
    const path = repo.write("t.jsonl", transcript.map((t) => JSON.stringify(t)).join("\n") + "\n{torn");
    const r = repo.run("node", [HUB, "usage", "--hook"], JSON.stringify({ hook_event_name: "SubagentStop", agent_type: "crew-developer",
      agent_id: "a1", agent_transcript_path: path }));
    expect(r.returncode, r.stderr).toBe(0);
    return events(repo, "--type", "report");
  };
  const said = (content: unknown, usage?: object) => ({ type: "assistant", message: { id: `m${Math.random()}`, role: "assistant", content,
    ...(usage ? { usage } : {}) } });

  it("keeps the last handback message, on the run's ref", () => {
    put(feed(), [act(3, { ref: "P-001" })]);
    const r = stop([said([{ type: "text", text: "working" }], { input_tokens: 5, output_tokens: 5 }),
      said([{ type: "tool_use", name: "SubagentHandback", input: { message: "first" } }]),
      said([{ type: "tool_use", name: "SubagentHandback", input: { message: "Done: T1-T3." } }]), said([{ type: "text", text: "bye" }])]);
    expect(r.map((e) => [e.ref, e.run, e.role, e.text])).toEqual([["P-001", "developer:a1", "developer", "Done: T1-T3."]]);
    expect(events(repo, "--type", "usage")).toHaveLength(1);
    expect(tr(repo, "ledger", "--ref", "P-001", "--type", "report").stdout).toContain("Done: T1-T3.");
  });

  it("falls back to the last text, without token usage, with secrets withheld and a cap", () => {
    const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz";
    const r = stop([said("first words"), said([{ type: "text", text: `Report: key ${key} ${"x".repeat(30_000)}` }])]);
    expect(r).toHaveLength(1);
    expect(r[0].ref).toBe(null);
    expect(r[0].text).toContain("Report: key [secret withheld]");
    expect(r[0].text).not.toContain(key);
    expect(r[0].text.length).toBe(20_000);
    expect(events(repo, "--type", "usage")).toEqual([]);
  });
});

describe("status: Running now", () => {
  const running = () => {
    const out = tr(repo, "status").stdout;
    const at = out.indexOf("## Running now");
    return at < 0 ? null : out.slice(at).split("\n\n")[1];
  };

  it("shows each live run with task, last action, age and tokens", () => {
    put(feed(), [act(30, { target: "x" }), act(3), act(2, { run: "qa:q1", role: "qa", ref: "P-002", tool: "Bash", target: "npx" })]);
    put(ledger(), [led(10, "checkpoint", { step: "T2" }), led(40, "usage", { tokens_in: 100, tokens_out: 20 })]);
    expect(running()?.split("\n")).toEqual([
      "- qa (qa:q1) — P-002 · task — · Bash npx 2m ago · tokens —",
      "- developer (developer:a1) — P-001 · task T2 · Edit src/a.ts 3m ago · tokens 120",
    ]);
  });

  it("drops stopped runs and runs quiet for a day, and shows a resumed one again", () => {
    expect(running()).toBe(null);
    put(feed(), [act(10), act(25 * 60, { run: "pm:old", role: "pm" })]);
    put(ledger(), [led(5, "report", { text: "done" })]);
    expect(running()).toBe(null);
    put(feed(), [act(1)]);
    expect(running()).toContain("developer (developer:a1)");
  });

  it("marks runs idle after limits.idle_minutes (default 20)", () => {
    put(feed(), [act(10)]);
    expect(running()).not.toContain("idle");
    repo.write(".crew/policy.yaml", "mode: ai-native\nlimits: { idle_minutes: 5 }\n");
    expect(running()).toContain("- **idle** developer (developer:a1)");
    expect(tr(repo, "policy", "check").stdout).toContain("Policy OK.");
    expect(tr(repo, "policy", "show", "--json").stdout).toContain('"idle_minutes": 5');
    expect(tr(repo, "policy", "show").stdout).toMatch(/limits\.idle_minutes\s+5/);
    repo.write(".crew/policy.yaml", "mode: ai-native\nlimits: { idle_minutes: soon }\n");
    expect(tr(repo, "policy", "check").stdout).toContain("limits.idle_minutes: expected a number");
  });
});

describe("stopped runs (BUG-034)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const director = (): any[] => {
    const r = tr(repo, "dispatch", "--json");
    expect(r.returncode, r.stderr).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.parse(r.stdout).entries.filter((e: any) => e.role === "director");
  };
  const live = () => tr(repo, "status").stdout.includes("developer (developer:a1)");
  const ended = () => (existsSync(ledger()) ? readFileSync(ledger(), "utf8") : "").split("\n").filter((l) => l.includes('"end-run"'));

  it("a run whose plan is done is not live and gives no director entry (AC1, AC4)", () => {
    readyPlan(repo);
    repo.commit("chore(hub): plan P-001");
    const r = tr(repo, "start", "P-001");
    expect(r.returncode, r.stderr).toBe(0);
    finish(repo, "P-001");
    put(feed(), [act(30)]);
    expect(director()).toEqual([]);
    expect(live()).toBe(false);
  });

  it("an idle run on an in-progress plan → director: resume or reassign, until end-run (AC2, AC3)", () => {
    readyPlan(repo);
    expect(tr(repo, "move", "P-001", "in-progress").returncode).toBe(0);
    put(feed(), [act(30)]);
    expect(director().map((e) => e.task)).toEqual(["run developer:a1 on P-001 idle for 30 min: resume or reassign"]);
    const r = tr(repo, "--as", "director", "end-run", "developer:a1", "--note", "stopped with TaskStop");
    expect([r.returncode, r.stdout.trim()], r.stderr).toEqual([0, "developer:a1 ended: no longer live."]);
    expect(director()).toEqual([]);
    expect(live()).toBe(false);
    expect(ended()).toHaveLength(1);
    put(feed(), [act(0)]); // it acts again: live again
    expect(live()).toBe(true);
  });

  it("end-run: only the executive or the director, only a live run, and a refusal writes nothing (AC2)", () => {
    put(feed(), [act(30)]);
    const qa = tr(repo, "--as", "qa", "end-run", "developer:a1");
    expect(qa.returncode).not.toBe(0);
    expect(qa.stderr + qa.stdout).toContain("Only the executive or the director ends a run; this run is the qa role.");
    const unknown = tr(repo, "--as", "director", "end-run", "pm:nobody");
    expect(unknown.returncode).not.toBe(0);
    expect(unknown.stderr + unknown.stdout).toContain("pm:nobody is not running.");
    expect(ended()).toEqual([]);
    expect(live()).toBe(true);
  });
});

describe("watch", () => {
  it("prints the recent feed, then follows it", async () => {
    put(feed(), [act(9, { target: "one" }), act(8, { ref: "P-002", target: "two" })]);
    put(ledger(), [led(7, "log", { text: "a note" })]);
    const run = (...args: string[]) => {
      const p = spawn("node", [HUB, "watch", ...args], { cwd: repo.path, env: repo.env });
      const out = { text: "" };
      p.stdout.on("data", (d: Buffer) => { out.text += d; });
      return { p, out };
    };
    const until = async (cond: () => boolean, ms: number) => {
      for (const end = Date.now() + ms; Date.now() < end && !cond();) await new Promise((r) => setTimeout(r, 50));
      return cond();
    };
    const all = run("--limit", "5"), only = run("--ref", "P-002");
    try {
      expect(await until(() => all.out.text.includes("following") && only.out.text.includes("following"), 10_000)).toBe(true);
      const first = all.out.text.split("\n");
      expect(first[0]).toContain("Edit one");
      expect(first[2]).toMatch(/log .*P-001 .*developer:a1 {2}a note/);
      expect(only.out.text).not.toContain("one");
      expect(only.out.text).toContain("Edit two");
      activity(call("Bash", { command: "node .crew/bin/crew.mjs resume P-001" }));
      expect(await until(() => all.out.text.includes("Bash crew.mjs resume"), 2_000)).toBe(true);
      expect(only.out.text).not.toContain("crew.mjs resume");
    } finally {
      all.p.kill();
      only.p.kill();
    }
  });
});
