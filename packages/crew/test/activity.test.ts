/** The activity feed (core/memory/activity.ts): what a tool call records (AC2, AC3), rotation and torn lines (AC4), and
 * which runs are live or idle (AC6, AC7). */
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe as group, expect, it } from "vitest";
import { type ActivityEvent, appendActivity, describe, liveRuns, previousRef, readActivity } from "../src/hub/core/memory/activity.js";
import type { LedgerEvent } from "../src/hub/core/memory/ledger.js";

const ROOT = mkdtempSync(join(tmpdir(), "hub-activity-root-"));
const feed = () => join(mkdtempSync(join(tmpdir(), "hub-activity-")), "activity.jsonl");
const ev = (over: Partial<ActivityEvent> = {}): ActivityEvent =>
  ({ ts: new Date().toISOString(), run: "developer:a1", role: "developer", ref: null, tool: "Bash", target: "ls", ...over });

group("describe", () => {
  it("records a file tool's path relative to the repository, its basename outside it", () => {
    expect(describe({ tool_name: "Edit", tool_input: { file_path: join(ROOT, "src/a.ts"), old_string: "x" } }, ROOT))
      .toEqual({ tool: "Edit", target: "src/a.ts", ref: null });
    expect(describe({ tool_name: "Read", tool_input: { file_path: "docs/b.md" }, cwd: ROOT }, ROOT).target).toBe("docs/b.md");
    expect(describe({ tool_name: "Read", tool_input: { file_path: "/etc/hosts" } }, ROOT).target).toBe("hosts");
    expect(describe({ tool_name: "NotebookEdit", tool_input: { notebook_path: join(ROOT, "n.ipynb") } }, ROOT).target).toBe("n.ipynb");
  });

  it("records a command's first word after cd and assignments, or the hub subcommand", () => {
    const bash = (command: string) => describe({ tool_name: "Bash", tool_input: { command } }, ROOT);
    expect(bash("cd packages/crew && FOO=1 npx vitest run test/x.test.ts").target).toBe("npx");
    expect(bash("/usr/bin/git status").target).toBe("git");
    expect(bash("cd /x && node .crew/bin/crew.mjs --as developer --run-id developer:a1 checkpoint P-027 --step T1"))
      .toEqual({ tool: "Bash", target: "crew.mjs checkpoint", ref: "P-027" });
    expect(bash("node .crew/bin/crew.mjs context feat-012").ref).toBe("FEAT-012");
    expect(bash("node .crew/bin/crew.mjs status").ref).toBe(null);
    expect(bash(".crew/bin/crew.mjs next").target).toBe("crew.mjs next");
  });

  it("treats a command that only mentions the hub as a plain command", () => {
    const bash = (command: string) => describe({ tool_name: "Bash", tool_input: { command } }, ROOT);
    expect(bash("echo crew.mjs secretword P-001")).toEqual({ tool: "Bash", target: "echo", ref: null });
    expect(bash("grep x .crew/bin/crew.mjs token")).toEqual({ tool: "Bash", target: "grep", ref: null });
    expect(JSON.stringify(bash("cat .crew/bin/crew.mjs && echo crew.mjs secretword"))).not.toContain("secretword");
  });

  it("stores no argument values", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB", url = "https://user:hunter22@example.com/x";
    const calls = [
      { tool_name: "Bash", tool_input: { command: `TOKEN=${secret} curl -H "Authorization: ${secret}" ${url}` } },
      { tool_name: "Write", tool_input: { file_path: join(ROOT, "w.txt"), content: `content ${secret}` } },
      { tool_name: "Grep", tool_input: { pattern: "needle-pattern-xyz", path: ROOT } },
    ];
    const out = JSON.stringify(calls.map((c) => describe(c, ROOT)));
    for (const s of [secret, url, "hunter22", "content", "needle-pattern-xyz", "Authorization"]) expect(out).not.toContain(s);
    expect(describe(calls[2], ROOT)).toEqual({ tool: "Grep", target: null, ref: null });
  });

  it("takes the ref from the worktree holding the cwd or the file", () => {
    const wt = join(ROOT, ".claude/worktrees/P-027-live-agent");
    expect(describe({ tool_name: "Edit", tool_input: { file_path: join(wt, "src/a.ts") } }, ROOT))
      .toEqual({ tool: "Edit", target: "src/a.ts", ref: "P-027" });
    expect(describe({ tool_name: "Bash", tool_input: { command: "npm test" }, cwd: join(wt, "packages") }, ROOT).ref).toBe("P-027");
    expect(describe({ tool_name: "Bash", tool_input: { command: "node .crew/bin/crew.mjs log G-007 hi" }, cwd: wt }, ROOT).ref).toBe("G-007");
  });
});

group("the feed file", () => {
  it("rotates at the size limit and reads the rotated file first", () => {
    const path = feed();
    appendActivity(path, ev({ target: "one" }), 200);
    appendActivity(path, ev({ target: "two" }), 200);
    expect(existsSync(path.replace(".jsonl", ".1.jsonl"))).toBe(false);
    appendActivity(path, ev({ target: "three" }), 200); // the file is now over 200 bytes: rotated first
    expect(existsSync(path.replace(".jsonl", ".1.jsonl"))).toBe(true);
    expect(readFileSync(path, "utf8").trim().split("\n")).toHaveLength(1);
    appendActivity(path, ev({ target: "four" }), 200);
    appendActivity(path, ev({ target: "five" }), 200); // rotated again: the older .1 is replaced
    expect(readActivity(path).map((e) => e.target)).toEqual(["three", "four", "five"]);
  });

  it("skips a torn last line and starts the next event on a fresh line", () => {
    const path = feed();
    appendActivity(path, ev({ target: "one" }));
    appendFileSync(path, '{"ts":"2026');
    expect(readActivity(path).map((e) => e.target)).toEqual(["one"]);
    appendActivity(path, ev({ target: "two" }));
    expect(readActivity(path).map((e) => e.target)).toEqual(["one", "two"]);
  });

  it("drops the event rather than wait for a held lock", () => {
    const path = feed();
    writeFileSync(`${path}.lock`, "someone");
    expect(appendActivity(path, ev())).toBe(false);
    expect(existsSync(path)).toBe(false);
  });

  it("finds the run's previous ref from the tail", () => {
    const path = feed();
    appendActivity(path, ev({ ref: "P-001" }));
    appendActivity(path, ev({ run: "qa:b2", ref: "P-002" }));
    expect(previousRef(path, "developer:a1")).toBe("P-001");
    expect(previousRef(path, "pm:c3")).toBe(null);
  });
});

group("liveRuns", () => {
  const NOW = Date.parse("2026-10-25T12:00:00Z");
  const at = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
  const led = (type: string, minutes: number, fields: Record<string, unknown> = {}): LedgerEvent =>
    ({ ts: at(minutes), type, ref: "P-001", run: "developer:a1", actor: "x", role: "developer", team: null, worktree: "/", ...fields } as LedgerEvent);

  it("shows a running run with its task, last action and tokens", () => {
    const runs = liveRuns([ev({ ts: at(30), ref: "P-001", target: "a" }), ev({ ts: at(2), ref: "P-001", tool: "Edit", target: "src/a.ts" })],
      [led("checkpoint", 20, { step: "T1" }), led("checkpoint", 10, { step: "T2" }), led("checkpoint", 5, { step: "T9", ref: "P-002" }),
        led("usage", 40, { tokens_in: 100, tokens_out: 20 })], NOW);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ run: "developer:a1", role: "developer", ref: "P-001", task: "T2", tool: "Edit", target: "src/a.ts",
      idle: false, tokens: 120 });
    expect(runs[0].minutes).toBeCloseTo(2);
  });

  it("drops a run that stopped, and shows it again once it resumes", () => {
    const acts = [ev({ ts: at(10) })];
    expect(liveRuns(acts, [led("report", 5)], NOW)).toEqual([]);
    expect(liveRuns(acts, [led("usage", 5)], NOW)).toEqual([]);
    const resumed = liveRuns([...acts, ev({ ts: at(1) })], [led("report", 5)], NOW);
    expect(resumed).toHaveLength(1);
    expect(resumed[0].tokens).toBe(null);
    expect(resumed[0].task).toBe(null);
  });

  it("counts a resumed run's transcript snapshots once", () => {
    const runs = liveRuns([ev({ ts: at(2) })], [led("usage", 40, { tokens_in: 100, tokens_out: 20, source: "transcript" }),
      led("usage", 20, { tokens_in: 300, tokens_out: 50, source: "transcript" })], NOW);
    expect(runs[0].tokens).toBe(350);
  });

  it("forgets runs quiet for over 24 hours", () => {
    expect(liveRuns([ev({ ts: at(24 * 60 + 1) })], [], NOW)).toEqual([]);
    expect(liveRuns([ev({ ts: at(24 * 60 - 1) })], [], NOW)).toHaveLength(1);
  });

  it("marks a run idle after the idle limit (default 20 minutes)", () => {
    const acts = [ev({ ts: at(10) })];
    expect(liveRuns(acts, [], NOW)[0].idle).toBe(false);
    expect(liveRuns(acts, [], NOW, 5)[0].idle).toBe(true);
    expect(liveRuns([ev({ ts: at(21) })], [], NOW)[0].idle).toBe(true);
  });

  it("lists the most recent run first", () => {
    const runs = liveRuns([ev({ ts: at(9), run: "qa:b" }), ev({ ts: at(3), run: "pm:c" }), ev({ ts: at(5) })], [], NOW);
    expect(runs.map((r) => r.run)).toEqual(["pm:c", "developer:a1", "qa:b"]);
  });
});
