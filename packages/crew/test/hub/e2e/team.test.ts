/** The agent team, part 1 — staffing, assignment, the lifecycle preset and its RACI gates, goal validation,
 * liveness and escalation. Ported from tests/crew/test_team.py (T3a, T3b); the rest is in team-2.test.ts. */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newBug, newGoal, newPlan, planFile, read, tr } from "./helpers.js";
import { as, events, LIFECYCLE, lifecycle, plan, ship, staffing, started } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

// ------------------------------------------------------------------ T3a: staffing
it("staff proposes the ready, non-overlapping frontier", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nteams:\n  api: { scope: [\"src/a/**\"] }\n  web: { scope: [\"src/b/**\"] }\n");
  plan(repo, "Alpha", "src/a/**");
  plan(repo, "Alpha detail", "src/a/x/**");
  plan(repo, "Beta", "src/b/**");
  plan(repo, "After alpha", "src/c/**", "--depends", "P-001");
  for (const p of ["P-001", "P-002", "P-003", "P-004"]) expect(tr(repo, "move", p, "ready").returncode).toBe(0);
  let s = staffing(repo);
  expect(s.start.map((p: { id: string; team: string }) => [p.id, p.team])).toEqual([["P-001", "api"], ["P-003", "web"]]);
  expect(Object.fromEntries(s.waiting.map((w: { id: string; why: string }) => [w.id, w.why])))
    .toEqual({ "P-002": "overlaps P-001 on its touches", "P-004": "depends on P-001" });
  const out = tr(repo, "staff").stdout;
  expect(out).toContain("START  P-001: Alpha [team api] → PM: assign P-001 --to developer --team api");
  expect(out).toContain("WAIT   P-004");
  // the dependent plan is proposed once its dependency is done, never alongside an overlapping one
  expect(tr(repo, "move", "P-001", "done", "--force").returncode).toBe(0);
  s = staffing(repo);
  expect(new Set(s.start.map((p: { id: string }) => p.id))).toEqual(new Set(["P-002", "P-003", "P-004"]));
});

it("staff stays within max_agents", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nbudgets: { max_agents: 2 }\n");
  plan(repo, "One", "src/one/**");
  plan(repo, "Two", "src/two/**");
  plan(repo, "Three", "src/three/**");
  for (const p of ["P-001", "P-002", "P-003"]) tr(repo, "move", p, "ready");
  repo.commit("chore(hub): plans");
  repo.env.CREW_RUN = "dev-1";
  expect(tr(repo, "start", "P-001").returncode).toBe(0); // one run holds work: one agent left
  repo.git("switch", "-q", "main");
  const s = staffing(repo);
  expect(s.free).toBe(1);
  expect(s.start.map((p: { id: string }) => p.id)).toEqual(["P-002"]);
  expect(s.waiting).toContainEqual({ id: "P-003", why: "no free agent (budgets.max_agents)" });
  expect(tr(repo, "next", "--as", "director").stdout).toContain("staff 1 ready plan");
});

// ------------------------------------------------------------------ T3a: assignment and the lifecycle preset
it("the lifecycle preset is a policy layer", () => {
  lifecycle(repo);
  const out = tr(repo, "policy", "show").stdout;
  expect(out).toContain("role_gates plan.done");
  expect(out).toContain("pm  (preset lifecycle)");
  expect(out).toContain("goal.active  (preset lifecycle)");
  expect(tr(repo, "policy", "show", "--role", "qa").stdout).toMatch(/paths.write +\.crew\/drafts\/\*\*  \(preset lifecycle role qa\)/);
  repo.write(".crew/policy.yaml", LIFECYCLE + "role_gates:\n  plan.dropped: director\n"); // the project adjusts it
  expect(tr(repo, "policy", "show").stdout).toMatch(/role_gates plan.dropped +director  \(project\)/);
  repo.write(".crew/policy.yaml", "preset: chaos\n");
  expect(tr(repo, "policy", "check").stdout).toContain("preset: 'chaos' is not a preset");
});

it("a developer starts only what the PM assigned to it", () => {
  lifecycle(repo);
  expect(newPlan(repo).returncode).toBe(0);
  let r = as(repo, "developer", "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the architect role"); // only the Architect specs
  expect(as(repo, "architect", "move", "P-001", "ready").returncode).toBe(0);
  repo.commit("chore(hub): ready");
  r = as(repo, "developer", "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("isn't assigned yet");
  expect(repo.git("branch", "--list", "plan/*").stdout).toBe(""); // refused before the branch
  r = as(repo, "developer", "assign", "P-001", "--to", "developer");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the pm role");
  expect(as(repo, "pm", "assign", "P-001", "--to", "developer").returncode).toBe(0);
  expect(read(planFile(repo, "P-001"))).toContain("assignee: developer");
  const e = events(repo, "--type", "assign").at(-1);
  expect([e.ref, e.to, e.role]).toEqual(["P-001", "developer", "pm"]);
  repo.commit("chore(hub): assign");
  r = as(repo, "qa", "start", "P-001", "--force");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("assigned to the developer role; this run is the qa role");
  expect(as(repo, "developer", "next").stdout).toContain("start P-001");
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
});

it("under the lifecycle only the PM completes and triages", () => {
  lifecycle(repo);
  expect(newBug(repo).returncode).toBe(0);
  let r = as(repo, "developer", "triage", "BUG-001", "--priority", "P1", "--severity", "S2");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the pm role");
  expect(as(repo, "pm", "triage", "BUG-001", "--priority", "P1", "--severity", "S2").returncode).toBe(0);
  expect(newPlan(repo).returncode).toBe(0);
  as(repo, "architect", "move", "P-001", "ready");
  as(repo, "pm", "assign", "P-001", "--to", "developer");
  repo.commit("chore(hub): plan");
  repo.env.CREW_RUN = "dev";
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
  ship(repo, "P-001");
  expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "qa";
  expect(as(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
  expect(as(repo, "qa", "next").stdout).toContain("report to the pm, who completes it");
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.env.CREW_RUN = "qa";
  r = as(repo, "qa", "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the pm role");
  repo.env.CREW_RUN = "pm";
  expect(as(repo, "pm", "next").stdout).toContain("complete P-001");
  expect(as(repo, "pm", "move", "P-001", "done").returncode).toBe(0);
});

it("activating the goal set waits for the executive", () => {
  lifecycle(repo);
  expect(newGoal(repo).returncode).toBe(0);
  const r = as(repo, "director", "move", "G-001", "active");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("a human gate");
  expect(tr(repo, "move", "G-001", "active", "--approved-by", "Amit").returncode).toBe(0);
});

it("role gates on one edge", () => {
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.in-progress: qa\n  plan.ready>in-progress: developer\n");
  expect(tr(repo, "policy", "check").returncode).toBe(0);
  expect(newPlan(repo).returncode).toBe(0);
  tr(repo, "move", "P-001", "ready");
  repo.commit("chore(hub): plan");
  const r = as(repo, "qa", "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the developer role"); // the edge's gate wins over the status's
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
  repo.write(".crew/policy.yaml", "mode: ai-native\nrole_gates:\n  plan.draft>done: pm\n");
  expect(tr(repo, "policy", "check").stdout).toContain("'plan.draft>done': plan can't go from 'draft' to 'done'");
});

// ------------------------------------------------------------------ T3b: goal validation, liveness, pause
it("a goal is done only when the PM verified it and nothing is left", () => {
  lifecycle(repo);
  expect(newGoal(repo).returncode).toBe(0);
  tr(repo, "move", "G-001", "active", "--approved-by", "Amit");
  expect(newPlan(repo, "Signup endpoint", PLAN_DRAFT, "--goal", "G-001").returncode).toBe(0);
  let r = as(repo, "director", "move", "G-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("AC1 is not verified");
  expect(r.stderr).toContain("P-001 is draft");
  expect(as(repo, "pm", "move", "P-001", "dropped").returncode).toBe(0);
  repo.env.CREW_RUN = "qa";
  expect(as(repo, "qa", "checkpoint", "G-001", "--verify", "signed up as a new user", "--result", "pass", "--ac", "1").returncode).toBe(0);
  r = as(repo, "director", "move", "G-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("verified by the qa role; the pm verifies goals");
  r = as(repo, "pm", "checkpoint", "G-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("A goal's checkpoint records evidence");
  repo.env.CREW_RUN = "pm";
  expect(as(repo, "pm", "checkpoint", "G-001", "--verify", "signed up as a new user", "--result", "pass", "--ac", "all").returncode).toBe(0);
  r = as(repo, "director", "move", "G-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("FEAT-001 is still open"); // the goal's breakdown items
  for (const i of ["FEAT-001", "FEAT-002"]) {
    expect(as(repo, "pm", "triage", i, "--reject", "wontfix", "--note", "out of this goal").returncode).toBe(0);
  }
  r = as(repo, "pm", "move", "G-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the director role"); // the PM verifies, the Director closes
  expect(as(repo, "director", "move", "G-001", "done").returncode).toBe(0);
});

it("a stale claim is flagged and reassigned", () => {
  started(repo, "dev-1");
  repo.commit("chore(P-001): start");
  repo.git("switch", "-q", "main");
  repo.write(".crew/policy.yaml", LIFECYCLE + "limits: { stale_claim_hours: 0 }\n"); // every claim is stale at once
  repo.commit("chore(hub): stale after 0h");
  expect(tr(repo, "check").stdout).toContain("P-001: claim by");
  expect(tr(repo, "check").stdout).toContain("is stale");
  expect(as(repo, "director", "next").stdout).toContain("stale: P-001");
  let r = as(repo, "developer", "reassign", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the director role");
  expect(as(repo, "director", "reassign", "P-001", "--note", "dev-1 went quiet").returncode).toBe(0);
  const e = events(repo).slice(-2);
  expect(e.map((x) => [x.type, x.ref])).toEqual([["release", "P-001"], ["assign", "P-001"]]);
  expect(e[1].to).toBe("developer");
  repo.env.CREW_RUN = "dev-2"; // a new developer takes the plan over on its existing branch
  r = as(repo, "developer", "start", "P-001");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).toContain("taken over where it stopped");
  expect(repo.git("branch", "--show-current").stdout.startsWith("plan/P-001")).toBe(true);
  const claim = events(repo, "--type", "claim").filter((x) => x.ref === "P-001").at(-1);
  expect(claim.run).toBe("dev-2");
  expect(claim.takeover).toBeTruthy();
  repo.write(".crew/policy.yaml", LIFECYCLE); // a fresh claim isn't stale: reassigning it needs --force
  r = as(repo, "director", "reassign", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("not stale");
});

it("the third bounce goes to the director", () => {
  started(repo);
  ship(repo, "P-001");
  for (const n of [1, 2, 3]) {
    expect(as(repo, "developer", "move", "P-001", "in-review").returncode, String(n)).toBe(0);
    expect(as(repo, "developer", "move", "P-001", "in-progress").returncode, String(n)).toBe(0);
  }
  let asks = events(repo, "--type", "ask");
  expect(asks.length).toBe(1);
  expect(asks[0].to).toBe("director");
  expect(asks[0].text).toContain("came back from review 3 times (limit 2)");
  const r = as(repo, "developer", "move", "P-001", "in-review");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("waits for an answer"); // blocked until the Director decides
  for (let n = 0; n < 6; n++) as(repo, "developer", "checkpoint", "P-001", "--attempt", `try ${n}`, "--why", "flaky");
  asks = events(repo, "--type", "ask");
  expect(asks.length).toBe(1); // one open question to the Director at a time per plan
});

it("attempts over the limit go to the director", () => {
  started(repo);
  for (let n = 0; n < 6; n++) {
    expect(as(repo, "developer", "checkpoint", "P-001", "--attempt", `approach ${n}`, "--why", "failed").returncode).toBe(0);
  }
  const asks = events(repo, "--type", "ask");
  expect(asks.length).toBe(1);
  expect(asks[0].text).toContain("has failed attempts recorded 6 times (limit 5)");
});
