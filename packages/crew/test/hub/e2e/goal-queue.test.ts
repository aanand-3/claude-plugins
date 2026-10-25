/** The goal queue (P-033): `run --check` moves the focus from a closed goal to the next approved one, and stops only
 * when no approved goal is left (AC2–AC6). */
import { expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { newGoal, newIdea, tr } from "./helpers.js";
import { as, lifecycle } from "./team-helpers.js";

/** G-001 focused and active, plus a second goal G-002 left `proposed`. Built in each test (BUG-022: hook timeouts). */
function setup(): Repo {
  const repo = Repo.create();
  lifecycle(repo);
  expect(newIdea(repo).returncode).toBe(0);
  expect(newGoal(repo).returncode).toBe(0);
  expect(newGoal(repo, "Billing").returncode).toBe(0);
  tr(repo, "move", "G-001", "active", "--approved-by", "Amit");
  tr(repo, "focus", "G-001");
  return repo;
}
const approve = (repo: Repo, g: string) => expect(tr(repo, "move", g, "active", "--approved-by", "Amit").returncode).toBe(0);
const close = (repo: Repo, g: string, to = "done") => expect(as(repo, "pm", "move", g, to, "--force").returncode).toBe(0);

it("a done focus goal moves the focus to the next approved goal (AC2)", () => {
  const repo = setup();
  approve(repo, "G-002");
  close(repo, "G-001");
  const r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).toContain("FOCUS  G-001 → G-002 (G-001 is done)");
  expect(r.stdout).toContain("QUEUE  G-002");
  const idea = repo.read(".crew/idea.md");
  expect(idea).toMatch(/^focus: G-002$/m);
  expect(idea).toContain("focus G-001 → G-002");
  expect(tr(repo, "run", "--check").stdout).not.toContain("FOCUS"); // moved once
});

it("stops when every approved goal is done, naming what waits for approval (AC3)", () => {
  const repo = setup();
  close(repo, "G-001");
  const r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(1);
  expect(r.stdout).toContain("STOP  all approved goals done: G-001; waiting for approval: G-002");
  expect(r.stdout).not.toContain("FOCUS");
  expect(repo.read(".crew/idea.md")).toMatch(/^focus: G-001$/m);
});

it("stops with no approved goal at all (AC4)", () => {
  const repo = Repo.create();
  lifecycle(repo);
  expect(newIdea(repo).returncode).toBe(0);
  expect(newGoal(repo).returncode).toBe(0);
  const r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(1);
  expect(r.stdout).toContain("no approved goal: the executive approves one");
  expect(r.stdout).toContain("waiting for approval: G-001");
});

it("a dropped focus advances like a done one; a proposed focus stays (AC5)", () => {
  const repo = setup();
  approve(repo, "G-002");
  close(repo, "G-001", "dropped");
  let r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).toContain("FOCUS  G-001 → G-002 (G-001 is dropped)");

  const other = Repo.create();
  lifecycle(other);
  expect(newIdea(other).returncode).toBe(0);
  expect(newGoal(other).returncode).toBe(0);
  expect(newGoal(other, "Billing").returncode).toBe(0);
  approve(other, "G-002");
  tr(other, "focus", "G-001"); // proposed
  r = tr(other, "run", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).not.toContain("FOCUS");
  expect(other.read(".crew/idea.md")).toMatch(/^focus: G-001$/m);
});

it("json carries the queue and the move (AC6)", () => {
  const repo = setup();
  approve(repo, "G-002");
  let s = JSON.parse(tr(repo, "run", "--check", "--json").stdout);
  expect(s.moved).toBeNull();
  expect(s.queue).toEqual(["G-001", "G-002"]);
  close(repo, "G-001");
  s = JSON.parse(tr(repo, "run", "--check", "--json").stdout);
  expect(s.moved).toEqual({ from: "G-001", to: "G-002" });
  expect(s.queue).toEqual(["G-002"]);
  expect(s.stop).toBe(false);
});
