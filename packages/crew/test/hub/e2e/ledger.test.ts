/** The hub, end to end — the ledger (shared by every worktree): where it lives, claims across worktrees, the WIP
 * limit per run, concurrent writers and usage. Ported from tests/crew/test_hub.py (section "the ledger"). */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { finish, init, newPlan, planFile, read, tr, write } from "./helpers.js";
import { events, readyPlan } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("the ledger lives in the git common dir and records moves and logs", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  expect(tr(repo, "log", "P-001", "picked the email provider").returncode).toBe(0);
  const ledger = join(repo.path, ".git/crew/ledger.jsonl");
  expect(existsSync(ledger) && statSync(ledger).isFile()).toBe(true);
  expect((readdirSync(join(repo.path, ".crew"), { recursive: true }) as string[])
    .filter((p) => basename(p).startsWith("ledger"))).toEqual([]);
  const evs = events(repo, "--ref", "P-001");
  expect(evs.map((e) => [e.type, e.to ?? null, e.text ?? null])).toEqual([
    ["move", "ready", null], ["log", null, "picked the email provider"]]);
  expect(evs[0].from).toBe("draft");
  expect(evs[0].actor).toBe("Test");
  expect(evs[0].run.startsWith("wt:")).toBe(true);
  expect(tr(repo, "ledger").stdout).toContain("move");
  expect(tr(repo, "ledger").stdout).toContain("draft → ready");
});

it("a refused command records no event", () => {
  init(repo, { commit: true });
  newPlan(repo, "Signup", PLAN_DRAFT, "--touches", "");
  expect(tr(repo, "move", "P-001", "ready").returncode).not.toBe(0); // no touches → refused
  expect(events(repo)).toEqual([]);
});

it("a claim is visible and refused from another worktree", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  const other = `${repo.path}-wt2`;
  repo.git("worktree", "add", "-q", "--detach", other);
  let r = tr(repo, "start", "P-001");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("claimed by Test");
  const wt2 = new Repo(other);
  wt2.env = repo.env;
  r = wt2.node(HUB, ["start", "P-001"]);
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("P-001 is claimed by Test");
  expect(wt2.node(HUB, ["ledger"]).stdout).toContain("P-001 Test"); // same ledger from either worktree
  expect(wt2.node(HUB, ["release", "P-001"]).returncode).not.toBe(0); // not this run's claim
  r = wt2.node(HUB, ["release", "P-001", "--force", "--note", "agent crashed"]);
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("released");
  expect(events(repo).filter((e) => e.type === "claim" && e.ref === "P-001").at(-1)!.force).toBeFalsy();
  expect(events(repo, "--type", "release").at(-1)!.reason).toBe("agent crashed");
});

it("done releases the claim and check compares the ledger with the files", () => {
  init(repo, { commit: true });
  readyPlan(repo);
  repo.commit("chore(hub): plan");
  tr(repo, "start", "P-001");
  finish(repo, "P-001");
  expect(events(repo, "--ref", "P-001").map((e) => e.type).slice(-2)).toEqual(["move", "release"]);
  expect(tr(repo, "ledger").stdout).not.toContain("claims:"); // nothing held any more
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("status: done", "status: in-review")); // a hand edit
  expect(tr(repo, "check").stdout).toContain("P-001: the ledger last moved it to done, but the plan says in-review");
});

it("the WIP limit is per run", () => {
  init(repo, { commit: true });
  readyPlan(repo, "One");
  readyPlan(repo, "Two");
  repo.commit("chore(hub): plans");
  Object.assign(repo.env, { CREW_RUN: "agent-a", CREW_ACTOR: "developer-1" });
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  repo.commit("chore(P-001): start");
  const r = tr(repo, "start", "P-002");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("WIP limit (1) reached: P-001"); // same run
  repo.git("switch", "-q", "main");
  Object.assign(repo.env, { CREW_RUN: "agent-b", CREW_ACTOR: "developer-2" });
  expect(tr(repo, "start", "P-002").returncode).toBe(0); // another agent has its own WIP
  const owners = Object.fromEntries(events(repo, "--type", "claim").map((e) => [e.ref, e.actor]));
  expect(owners).toEqual({ "P-001": "developer-1", "P-002": "developer-2" });
  expect(tr(repo, "status").stdout).toContain("| P-002 | Two | — | in-progress | 0/2 | developer-2 |");
});

it("parallel writers lose no events", async () => {
  init(repo, { commit: true });
  const codes = await Promise.all(Array.from({ length: 20 }, (_, n) => new Promise<number | null>((resolve, reject) => {
    const p = spawn("node", [HUB, "usage", "--cost", "0.01", "--tokens-in", "100", "--ref", "P-001"],
      { cwd: repo.path, env: { ...repo.env, CREW_ACTOR: `agent-${n % 3}` }, stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.resume();
    p.stderr.resume();
    p.on("error", reject);
    p.on("close", resolve);
  })));
  expect(codes.every((c) => c === 0)).toBe(true);
  const usage = events(repo, "--type", "usage");
  expect(usage.length).toBe(20);
  expect(existsSync(join(repo.path, ".git/crew/ledger.jsonl.lock"))).toBe(false);
  const out = tr(repo, "status").stdout;
  expect(out).toContain("## Spend");
  expect(out).toContain("$0.20 · 2000 tokens");
});

it("usage needs numbers", () => {
  init(repo);
  expect(tr(repo, "usage").returncode).not.toBe(0);
  expect(tr(repo, "usage", "--cost", "abc").returncode).not.toBe(0);
  expect(tr(repo, "usage", "--tokens-in", "x").returncode).toBe(2);
  expect(events(repo)).toEqual([]);
});
