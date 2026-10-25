/** The live `ui` server (AC9, FEAT-019): `/api/activity`, and change events for ledger-only writes, activity appends and
 * commits in a linked worktree — but not for lock files. Drives the built bundle. */
import { type ChildProcess, spawn } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { init, tr } from "./helpers.js";
import { agent } from "./sections.js";

let repo: Repo;
const servers: ChildProcess[] = [];

beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true });
  agent(repo, "crew-developer", "developer");
  repo.commit("chore: hub");
});
afterEach(() => { for (const s of servers.splice(0)) s.kill(); });

async function serve(cwd = repo.path): Promise<string> {
  const server = spawn("node", [HUB, "ui", "--no-open", "--port", "0"], { cwd, env: repo.env });
  servers.push(server);
  return new Promise<string>((resolve, reject) => {
    server.stdout!.on("data", (b: Buffer) => { const m = /(http:\/\/127\.0\.0\.1:\d+\/)/.exec(String(b)); if (m) resolve(m[1]); });
    server.on("exit", () => reject(new Error("server exited")));
  });
}

/** The change stream, read in the background: `next()` waits for a change event after the call (false on timeout). */
async function changes(url: string) {
  const reader = (await fetch(`${url}api/events`)).body!.getReader();
  let seen = "";
  void (async () => {
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) return;
      seen += new TextDecoder().decode(value);
    }
  })();
  const settle = () => new Promise((r) => setTimeout(r, 400));
  return {
    async next(act: () => void, ms = 3_000): Promise<boolean> {
      await settle();
      const from = seen.length;
      act();
      for (const end = Date.now() + ms; Date.now() < end;) {
        if (seen.slice(from).includes("event: change")) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return false;
    },
    close: () => reader.cancel(),
  };
}

const hook = (command: string) => repo.run("node", [HUB, "activity", "--hook"], JSON.stringify({
  hook_event_name: "PostToolUse", agent_type: "crew-developer", agent_id: "a1", tool_name: "Bash", tool_input: { command }, cwd: repo.path }));

it("serves the running runs and the recent activity", async () => {
  const url = await serve();
  expect(await (await fetch(`${url}api/activity`)).json()).toEqual({ running: [], recent: [] });
  hook("node .crew/bin/crew.mjs checkpoint P-001 --step T1");
  const a = await (await fetch(`${url}api/activity`)).json();
  expect(a.recent).toHaveLength(1);
  expect(a.recent[0]).toMatchObject({ run: "developer:a1", ref: "P-001", tool: "Bash", target: "crew.mjs checkpoint" });
  expect(a.running).toEqual([expect.objectContaining({ run: "developer:a1", role: "developer", ref: "P-001", idle: false, tokens: null })]);
}, 20_000);

it("filters the activity to one ref and adds its feed of tool calls and ledger events", async () => {
  const url = await serve();
  hook("node .crew/bin/crew.mjs checkpoint P-001 --step T1");
  repo.run("node", [HUB, "activity", "--hook"], JSON.stringify({ hook_event_name: "PostToolUse", agent_type: "crew-developer",
    agent_id: "b2", tool_name: "Bash", tool_input: { command: "node .crew/bin/crew.mjs checkpoint P-002 --step T3" }, cwd: repo.path }));
  const later = new Date(Date.now() + 1_000).toISOString();
  appendFileSync(join(repo.path, ".git/crew/ledger.jsonl"), `${JSON.stringify({ ts: later, type: "checkpoint", ref: "P-001",
    run: "developer:a1", actor: "dev", role: "developer", team: null, worktree: repo.path, step: "T1", sha: "abcdef0123" })}\n`);
  for (const ref of ["P-001", "p-001"]) {
    const a = await (await fetch(`${url}api/activity?ref=${ref}`)).json();
    expect(Object.keys(a).sort()).toEqual(["feed", "recent", "running"]);
    expect(a.running).toEqual([expect.objectContaining({ run: "developer:a1", ref: "P-001" })]);
    expect(a.recent.map((e: { run: string }) => e.run)).toEqual(["developer:a1"]);
    expect(a.feed).toEqual([
      { ts: expect.any(String), type: "tool", run: "developer:a1", ref: "P-001", text: "Bash crew.mjs checkpoint" },
      { ts: later, type: "checkpoint", run: "developer:a1", ref: "P-001", text: "at T1 (abcdef0)" },
    ]);
  }
  expect((await fetch(`${url}api/activity?ref=bad`)).status).toBe(400);
  const all = await (await fetch(`${url}api/activity`)).json();
  expect(Object.keys(all).sort()).toEqual(["recent", "running"]);
  expect(all.recent).toHaveLength(2);
}, 20_000);

it("sends a change for a ledger-only write and an activity append, not for a lock file", async () => {
  const url = await serve();
  const c = await changes(url);
  try {
    expect(await c.next(() => { expect(tr(repo, "pause", "--reason", "lunch").returncode).toBe(0); })).toBe(true);
    expect(await c.next(() => { hook("ls"); })).toBe(true);
    const dir = join(repo.path, ".git/crew");
    mkdirSync(dir, { recursive: true });
    expect(await c.next(() => { writeFileSync(join(dir, "ledger.jsonl.lock"), "x"); }, 1_000)).toBe(false);
    expect(await c.next(() => { appendFileSync(join(dir, "activity.jsonl.lock.stale-1"), "x"); }, 1_000)).toBe(false);
  } finally {
    await c.close();
  }
}, 30_000);

it("outside git (the ledger in .crew itself), a server still sees edits deep in .crew and ledger writes", async () => {
  const plain = Repo.create(false);
  plain.env = repo.env;
  expect(tr(plain, "init").returncode).toBe(0);
  const c = await changes(await serve(plain.path));
  try {
    expect(await c.next(() => { plain.write(".crew/plans/P-099-x.md", "---\nid: P-099\n---\n"); })).toBe(true);
    expect(await c.next(() => { expect(tr(plain, "pause").returncode).toBe(0); })).toBe(true);
  } finally {
    await c.close();
  }
}, 30_000);

it("a server in a linked worktree sends a change when a commit lands", async () => {
  const wt = `${repo.path}-wt`;
  repo.git("worktree", "add", "-q", "-b", "feature", wt);
  const url = await serve(wt);
  const c = await changes(url);
  try {
    const other = new Repo(wt);
    other.env = repo.env;
    other.write("a.txt", "a\n");
    expect(await c.next(() => { other.commit("feat: a"); })).toBe(true);
  } finally {
    await c.close();
  }
}, 30_000);
