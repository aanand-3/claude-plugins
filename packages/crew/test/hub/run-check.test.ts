/** `run --check` and escalations (FEAT-026): an escalation about a plan or an item holds that document only; the team
 * stops on one with no ref (or about the idea or a goal), or when escalations hold everything that could move. */
import { expect, it } from "vitest";
import { Repo } from "../helpers/repo.js";
import { newBug, newGoal, newIdea, tr } from "./e2e/helpers.js";
import { as, lifecycle, plan } from "./e2e/team-helpers.js";

/** A focused, active goal with two ready plans. Called in each test, not in a hook: vitest's 10s hook timeout is too short
 * for these hub runs on a busy machine (BUG-022); the 120s test timeout covers them. */
function setup(): Repo {
  const repo = Repo.create();
  lifecycle(repo);
  expect(newIdea(repo).returncode).toBe(0);
  expect(newGoal(repo).returncode).toBe(0);
  tr(repo, "move", "G-001", "active", "--approved-by", "Amit");
  tr(repo, "focus", "G-001");
  plan(repo, "Signup endpoint", "src/auth/**");
  plan(repo, "Password reset", "src/reset/**");
  for (const p of ["P-001", "P-002"]) expect(as(repo, "architect", "move", p, "ready").returncode).toBe(0);
  return repo;
}

it("an escalation on one plan holds it; the team goes on with the others", () => {
  const repo = setup();
  expect(as(repo, "director", "escalate", "P-001", "Ship to production?").returncode).toBe(0);
  const r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(0);
  expect(r.stdout).toContain("GO");
  expect(r.stdout).toMatch(/HELD {2}P-001 \(Q-[0-9a-f]{6}\)/);
  expect(r.stdout).not.toContain("P-002");
  const s = JSON.parse(tr(repo, "run", "--check", "--json").stdout);
  expect(s.stop).toBe(false);
  expect(s.held).toHaveLength(1);
  expect(s.held[0]).toMatch(/^P-001 \(/);
});

it("escalations holding every open plan and item stop the team and name them", () => {
  const repo = setup();
  expect(newBug(repo).returncode).toBe(0);
  // the goal's candidate plans (FEAT-001, FEAT-002) are open items too
  for (const ref of ["P-001", "P-002", "FEAT-001", "FEAT-002"]) {
    expect(as(repo, "director", "escalate", ref, `Go ahead with ${ref}?`).returncode).toBe(0);
  }
  let r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(0); // the bug is still open and unheld
  expect(as(repo, "director", "escalate", "BUG-001", "Is this a bug?").returncode).toBe(0);
  r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(1);
  expect(r.stdout).toContain("STOP");
  for (const ref of ["P-001", "P-002", "FEAT-001", "FEAT-002", "BUG-001"]) expect(r.stdout).toContain(ref);
});

it("an escalation with no ref stops the team", () => {
  const repo = setup();
  expect(as(repo, "director", "escalate", "Hire a designer?").returncode).toBe(0);
  const r = tr(repo, "run", "--check");
  expect(r.returncode, r.stdout).toBe(1);
  expect(r.stdout).toContain("waiting for the executive");
  expect(r.stdout).toContain("Hire a designer?");
});
