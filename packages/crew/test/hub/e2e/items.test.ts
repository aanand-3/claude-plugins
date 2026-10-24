/** The hub, end to end — backlog items: intake, the triage gate, goal breakdowns, plan links, derived status and
 * next's ordering. Ported from tests/crew/test_hub.py (section "backlog items"). */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { GOAL_DRAFT, PLAN_DRAFT } from "./fixtures.js";
import { finish, goalFile, init, item, newBug, newGoal, newPlan, planFile, read, tr, write } from "./helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("item intake and the triage gate", () => {
  init(repo);
  expect(tr(repo, "new-item", "bug", "Crash", "--why", "500 on login").returncode).toBe(0);
  let r = tr(repo, "triage", "BUG-001", "--severity", "S2");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Steps to reproduce");
  expect(r.stderr).toContain("Nothing was changed");
  expect(item(repo, "BUG-001")).toContain("status: new");
  expect(item(repo, "BUG-001")).not.toContain("severity: \n");

  expect(newBug(repo, "Login 500", "--severity", "S1").returncode).toBe(0);
  expect(item(repo, "BUG-002")).toContain("priority: P0"); // severity → default priority
  expect(item(repo, "BUG-002")).toContain("status: triaged"); // severity at intake triages when the gate passes

  tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked for it");
  expect(item(repo, "FEAT-001")).toContain("status: new");
  expect(tr(repo, "triage", "FEAT-001", "--priority", "P2").returncode).toBe(0);
  expect(item(repo, "FEAT-001")).toContain("status: triaged");
  expect(item(repo, "FEAT-001")).not.toContain("points");

  r = tr(repo, "triage", "BUG-001", "--reject", "duplicate");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("--note");
  expect(tr(repo, "triage", "BUG-001", "--reject", "duplicate", "--note", "same as BUG-002").returncode).toBe(0);
  expect(item(repo, "BUG-001")).toContain("status: duplicate");
  expect(item(repo, "BUG-001")).toContain("same as BUG-002");
});

it("a new item with a priority is triaged", () => {
  init(repo);
  let r = tr(repo, "new-item", "chore", "Project tooling", "--why", "dev env", "--priority", "P0");
  expect(r.returncode, r.stderr).toBe(0);
  expect(item(repo, "CHORE-001")).toContain("status: triaged");
  r = tr(repo, "new-item", "spike", "Rate limits", "--why", "unknown", "--priority", "P1");
  expect(item(repo, "SPIKE-001")).toContain("status: new"); // a spike needs its Question and Timebox
  expect(r.stdout).toContain("stays new");
  expect(r.stdout).toContain("Question");
});

it("a goal's breakdown becomes triaged items", () => {
  init(repo);
  expect(newGoal(repo, "Accounts", GOAL_DRAFT, "--priority", "P1").returncode).toBe(0);
  const goal = read(goalFile(repo, "G-001"));
  expect(goal).toContain("## Breakdown");
  expect(goal).not.toContain("## Candidate plans");
  expect(goal).not.toContain("milestone");
  expect(goal).toContain("- FEAT-001: Signup endpoint — POST /signup with email verification");
  const [feat1, feat2] = [item(repo, "FEAT-001"), item(repo, "FEAT-002")];
  expect(feat1).toContain("title: Signup endpoint");
  expect(feat1).toContain("status: triaged");
  expect(feat1).toContain("goal: G-001");
  expect(feat1).toContain("priority: P1");
  expect(feat2).toContain("title: Password reset");
  expect(feat2).toContain("status: triaged");
  expect(tr(repo, "next").stdout).toContain("write a plan for FEAT-001");
});

it("a plan links items and the item status is derived", () => {
  init(repo, { commit: true });
  newGoal(repo);
  repo.write(".crew/drafts/plan.md", PLAN_DRAFT);
  let r = tr(repo, "new-plan", "Signup", "--from", ".crew/drafts/plan.md", "--items", "FEAT-001,FEAT-002", "--touches", "src/**");
  expect(r.returncode, r.stderr).toBe(0);
  expect(item(repo, "FEAT-001")).toContain("plan: P-001");
  r = newPlan(repo, "Again", PLAN_DRAFT, "--items", "FEAT-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("already planned in P-001");

  tr(repo, "move", "P-001", "ready");
  repo.commit("chore(hub): plan P-001");
  tr(repo, "start", "P-001");
  finish(repo, "P-001");
  repo.commit("chore(P-001): complete");
  repo.git("switch", "-q", "main");
  const out = tr(repo, "status").stdout; // reads the live branch: done before merge
  expect(out.split("## Recently done")[1]).toContain("P-001: Signup");
  const graph = tr(repo, "export", "--json").stdout;
  expect(graph).toMatch(/"id": "FEAT-001",\s+"kind": "item",\s+"type": "FEAT",\s+"title": "Signup endpoint",\s+"status": "done"/);
  expect(graph).toContain('"goal": "G-001"'); // the plan's goal comes from its items
});

it("a bug plan needs a regression test", () => {
  init(repo);
  newBug(repo, "Login 500", "--severity", "S2");
  newPlan(repo, "Fix login 500", PLAN_DRAFT, "--items", "BUG-001");
  const r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("regression test");
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] 201 on valid input", "- [ ] regression test: empty email → 422; 201 on valid input"));
  expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
});

it("an untriaged item blocks ready", () => {
  init(repo);
  tr(repo, "new-item", "feat", "Dark mode", "--why", "asked");
  newPlan(repo, "Dark mode", PLAN_DRAFT, "--items", "FEAT-001");
  const r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("item FEAT-001 is not triaged");
});

it("next's ordering expedites P0 bugs", () => {
  init(repo, { commit: true });
  newPlan(repo, "Signup");
  tr(repo, "move", "P-001", "ready");
  expect(tr(repo, "next").stdout).toContain("NEXT         P-001");
  newBug(repo, "Data loss", "--severity", "S1");
  expect(tr(repo, "next").stdout).toContain("expedite BUG-001");
  expect(tr(repo, "check").stdout).toContain("BUG-001: P0 bug with no plan");
});
