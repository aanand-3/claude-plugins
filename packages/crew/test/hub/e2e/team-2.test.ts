/** The agent team, part 2 — pause, kickoff in the ledger, code review, QA-only evidence, RACI, merge order and
 * autonomy (runner, notify, usage, fast lane). Ported from tests/crew/test_team.py (T3b–T7); part 1 is team.test.ts. */
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { HUB as HUB_PATH, Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newBug, newGoal, newIdea, newPlan, planFile, read, tr } from "./helpers.js";
import { agent, as, events, finish, hook, inReview, LIFECYCLE, lifecycle, plan, ship, TRANSCRIPT, type Json } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("a paused team staffs and starts nothing", () => {
  lifecycle(repo);
  expect(newPlan(repo).returncode).toBe(0);
  as(repo, "architect", "move", "P-001", "ready");
  as(repo, "pm", "assign", "P-001", "--to", "developer");
  repo.commit("chore(hub): plan");
  let r = as(repo, "developer", "pause");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("Only the executive or the director");
  expect(tr(repo, "pause", "--reason", "budget review").returncode).toBe(0); // the human, in no role
  for (const cmd of [["staff"], ["start", "P-001"]]) {
    r = as(repo, cmd[0] === "start" ? "developer" : "director", ...cmd);
    expect(r.returncode, cmd.join(" ")).not.toBe(0);
    expect(r.stderr, cmd.join(" ")).toContain("The team is paused (budget review");
  }
  expect(tr(repo, "check").stdout).toContain("team paused by");
  expect(tr(repo, "status").stdout).toContain("Team paused");
  expect(as(repo, "director", "next").stdout).toContain("the team is paused");
  expect(as(repo, "director", "resume", "--team").returncode).toBe(0);
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
});

// ------------------------------------------------------------------ T4: kickoff as a ledger workflow, code review
it("kickoff runs in the ledger", () => {
  init(repo);
  expect(tr(repo, "resume", "--workflow", "kickoff").stdout).toContain("kickoff: not started — begin with preflight");
  for (const step of ["preflight", "discover"]) {
    expect(tr(repo, "checkpoint", "--workflow", "kickoff", "--step", step).returncode).toBe(0);
  }
  expect(tr(repo, "checkpoint", "--workflow", "kickoff", "--step", "design", "--skip", "--note", "a CLI").returncode).toBe(0);
  expect(as(repo, "architect", "checkpoint", "--workflow", "kickoff", "--step", "guidelines").returncode).toBe(0);
  const out = tr(repo, "resume", "--workflow", "kickoff").stdout;
  for (const s of ["skipped  design", "a CLI", "architect", "next: hub"]) expect(out).toContain(s);
  const state = JSON.parse(tr(repo, "resume", "--workflow", "kickoff", "--json").stdout);
  expect(state.next).toBe("hub");
  expect(state.steps.slice(0, 4).map((s: { state: string }) => s.state)).toEqual(["done", "done", "skipped", "done"]);
  const r = tr(repo, "checkpoint", "--workflow", "kickoff", "--step", "deploy");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("kickoff has no step 'deploy'");
  expect(tr(repo, "resume", "--workflow", "launch").returncode).not.toBe(0);
  expect(tr(repo, "ledger").stdout).toContain("kickoff: guidelines done");
});

it("review sends changes back, and done needs an approval of the current code", () => {
  inReview(repo);
  repo.env.CREW_RUN = "pm";
  let r = as(repo, "pm", "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("no code review yet"); // QA's evidence alone isn't enough under the preset
  repo.env.CREW_RUN = "dev";
  r = as(repo, "developer", "review", "P-001", "--approve");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the architect role");
  r = as(repo, "architect", "review", "P-001", "--approve"); // the implementing run, even in the right role
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("implemented P-001");
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "next").stdout).toContain("review P-001");
  r = as(repo, "qa", "review", "P-001", "--approve");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the architect role");
  expect(as(repo, "architect", "review", "P-001", "--changes", "validate the email").returncode).toBe(0);
  expect(read(planFile(repo, "P-001"))).toContain("in-progress");
  expect(read(planFile(repo, "P-001"))).toContain("changes requested: validate the email");
  const claim = events(repo, "--type", "claim").filter((e) => e.ref === "P-001").at(-1);
  expect(claim.run).toBe("dev"); // the developer still holds it
  repo.env.CREW_RUN = "dev";
  expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.commit("chore(hub): reviewed"); // hub bookkeeping isn't a code change
  repo.env.CREW_RUN = "pm";
  repo.write("src/auth/signup.py", "def signup(): return 1\n");
  repo.commit("feat(P-001): after the review");
  r = as(repo, "pm", "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("the code changed since the approving review");
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.env.CREW_RUN = "pm";
  r = as(repo, "pm", "move", "P-001", "done");
  expect(r.returncode, r.stderr).toBe(0);
  expect(events(repo, "--type", "review").map((e) => e.verdict)).toEqual(["changes", "approve", "approve"]);
});

// ------------------------------------------------------------------ T5: Developer & QA, QA-only evidence
it("only QA checks count as evidence under the lifecycle", () => {
  inReview(repo); // QA checked every criterion with --run true
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.env.CREW_RUN = "pm"; // a later check by another role replaces QA's as the latest — and doesn't count
  expect(as(repo, "pm", "checkpoint", "P-001", "--verify", "looked fine", "--result", "pass", "--ac", "all").returncode).toBe(0);
  const r = as(repo, "pm", "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("checked by the pm role; only the qa role's checks count (evidence.role)");
  repo.env.CREW_RUN = "qa";
  expect(as(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
  repo.env.CREW_RUN = "pm";
  expect(as(repo, "pm", "move", "P-001", "done").returncode).toBe(0);
});

/** One check per enforced row: what each role may not do. */
it("RACI under the lifecycle", () => {
  lifecycle(repo);
  expect(newBug(repo).returncode).toBe(0);
  expect(newPlan(repo).returncode).toBe(0);
  const refused: [string[], string][] = [
    [["developer", "triage", "BUG-001", "--priority", "P1", "--severity", "S2"], "for the pm role"],
    [["developer", "move", "P-001", "ready"], "for the architect role"],
    [["pm", "move", "P-001", "ready"], "for the architect role"],
    [["qa", "move", "P-001", "ready"], "for the architect role"],
  ];
  for (const [[role, ...cmd], why] of refused) {
    const r = as(repo, role, ...cmd);
    const msg = JSON.stringify([role, cmd, r.stderr]);
    expect(r.returncode, msg).not.toBe(0);
    expect(r.stderr, msg).toContain(why);
  }
  expect(as(repo, "architect", "move", "P-001", "ready").returncode).toBe(0);
  for (const role of ["developer", "qa", "architect", "director"]) {
    const r = as(repo, role, "assign", "P-001", "--to", "developer");
    expect(r.returncode, role).not.toBe(0);
    expect(r.stderr, role).toContain("for the pm role");
  }
  // QA can't edit code (the guard); it writes drafts only
  agent(repo, "crew-qa", "qa");
  const w = (p: string) => hook(repo, { tool_name: "Write", agent_type: "crew-qa", agent_id: "a", tool_input: { file_path: p } });
  expect(w("src/auth/signup.py").permissionDecision).toBe("deny");
  expect(w(".crew/drafts/bug.md")).toBeNull();
  agent(repo, "crew-developer", "developer");
  expect(hook(repo, { tool_name: "Write", agent_type: "crew-developer", agent_id: "a",
    tool_input: { file_path: "src/auth/signup.py" } })).toBeNull();
});

// ------------------------------------------------------------------ T6: Release and merge order
it("merge order puts dependencies first", () => {
  init(repo, { commit: true });
  plan(repo, "Base", "src/P-001.txt");
  plan(repo, "On top", "src/P-002.txt", "--depends", "P-001");
  plan(repo, "Apart", "src/P-003.txt");
  for (const p of ["P-001", "P-002", "P-003"]) tr(repo, "move", p, "ready");
  repo.commit("chore(hub): plans");
  finish(repo, "P-003");
  repo.env.CREW_RUN = "two";
  finish(repo, "P-001");
  let out = JSON.parse(tr(repo, "merge-order", "--json").stdout);
  expect(out.merge.map((p: Json) => p.id)).toEqual(["P-003", "P-001"]);
  expect(out.base).toBe("main");
  const branch = (pid: string): string => out.merge.find((p: Json) => p.id === pid).branch;
  repo.git("merge", "-q", "--no-ff", "-m", "merge P-001", branch("P-001"));
  repo.env.CREW_RUN = "three";
  finish(repo, "P-002"); // depends on P-001, which is merged now
  out = JSON.parse(tr(repo, "merge-order", "--json").stdout);
  expect(out.merge.map((p: Json) => p.id)).toEqual(["P-003", "P-002"]);
  expect(out.merged.map((p: Json) => p.id)).toEqual(["P-001"]);
  expect(tr(repo, "next", "--as", "release").stdout).toContain("merge-order");
});

it("a plan waits for its unmerged dependency", () => {
  init(repo, { commit: true });
  plan(repo, "Base", "src/P-001.txt");
  plan(repo, "On top", "src/P-002.txt", "--depends", "P-001");
  for (const p of ["P-001", "P-002"]) tr(repo, "move", p, "ready");
  repo.commit("chore(hub): plans");
  expect(tr(repo, "start", "P-001").returncode).toBe(0); // still in progress
  repo.commit("chore(P-001): start");
  repo.git("switch", "-q", "main");
  repo.env.CREW_RUN = "two";
  finish(repo, "P-002", "--force"); // done out of order, by hand
  const out = JSON.parse(tr(repo, "merge-order", "--json").stdout);
  expect(out.merge).toEqual([]);
  expect(out.waiting).toEqual([{ id: "P-002", why: "depends on P-001, not merged yet" }]);
  expect(tr(repo, "merge-order").stdout).toContain("WAIT P-002: depends on P-001");
});

// ------------------------------------------------------------------ T7: autonomy
it("the runner stops on escalation, pause, budget and no approved goal left", () => {
  lifecycle(repo);
  expect(newIdea(repo).returncode).toBe(0);
  expect(newGoal(repo).returncode).toBe(0);
  let r = tr(repo, "run", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("no approved goal");
  tr(repo, "move", "G-001", "active", "--approved-by", "Amit");
  r = tr(repo, "run", "--check"); // the goal queue focuses the approved goal
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("FOCUS  — → G-001");
  expect(tr(repo, "run").stdout).toContain("while node .crew/bin/crew.mjs run --check");
  expect(as(repo, "director", "escalate", "G-001", "Ship to production?").returncode).toBe(0);
  r = tr(repo, "run", "--check");
  expect(r.returncode).toBe(1);
  expect(r.stdout).toContain("waiting for the executive");
  const qid = events(repo, "--type", "ask").at(-1).qid;
  tr(repo, "answer", qid, "not yet", "--approved-by", "Amit");
  tr(repo, "pause", "--reason", "holiday");
  expect(tr(repo, "run", "--check").stdout).toContain("paused by");
  tr(repo, "resume", "--team");
  repo.write(".crew/policy.yaml", LIFECYCLE + "budgets: { project: { max_tokens: 100 } }\n");
  tr(repo, "usage", "--tokens-in", "150");
  expect(tr(repo, "run", "--check").stdout).toContain("budget: project tokens");
  repo.write(".crew/policy.yaml", LIFECYCLE);
  expect(tr(repo, "run", "--check").returncode).toBe(0);
  expect(as(repo, "pm", "move", "G-001", "done", "--force").returncode).toBe(0);
  expect(tr(repo, "run", "--check").stdout).toContain("all approved goals done: G-001");
});

it("notify runs the policy command once per event", () => {
  lifecycle(repo);
  const out = join(repo.path, "notified.jsonl");
  repo.write(".crew/policy.yaml", LIFECYCLE + `notify:\n  command: "cat >> ${out}; echo >> ${out}"\n  on: [escalation, paused]\n`);
  expect(newGoal(repo).returncode).toBe(0);
  expect(as(repo, "director", "escalate", "G-001", "Budget for a designer?").returncode).toBe(0);
  expect(as(repo, "director", "ask", "G-001", "--to", "pm", "Which slice first?").returncode).toBe(0); // not an escalation
  tr(repo, "pause");
  const sent = read(out).split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
  expect(sent.map((e) => [e.kind, e.ref])).toEqual([["escalation", "G-001"], ["paused", null]]);
  expect(sent[0].role).toBe("director");
  expect(sent[0].text).toContain("Budget for a designer?");
  repo.write(".crew/policy.yaml", LIFECYCLE + "notify: { command: \"exit 3\", on: [escalation] }\n");
  const r = as(repo, "director", "escalate", "G-001", "Again?");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("notify.command failed"); // a broken notifier never blocks the team
  repo.write(".crew/policy.yaml", LIFECYCLE + "notify: { on: [lunch] }\n");
  expect(tr(repo, "policy", "check").stdout).toContain("notify.on: 'lunch' is not one of");
});

it("usage is captured from each agent's transcript, and budgets bite", () => {
  lifecycle(repo);
  repo.write(".crew/policy.yaml", LIFECYCLE + "budgets: { project: { max_tokens: 200 } }\n");
  agent(repo, "crew-qa", "qa");
  const path = repo.write("transcript.jsonl", TRANSCRIPT.map((t) => JSON.stringify(t)).join("\n") + "\n{torn");
  const payload = { hook_event_name: "SubagentStop", agent_type: "crew-qa", agent_id: "x9", agent_transcript_path: path };
  const r = repo.run("node", [HUB_PATH, "usage", "--hook"], JSON.stringify(payload));
  expect(r.returncode, r.stderr).toBe(0);
  const e = events(repo, "--type", "usage").at(-1);
  expect([e.role, e.run, e.tokens_in, e.tokens_out, e.cache_read, e.model])
    .toEqual(["qa", "qa:x9", 113, 100, 900, "claude-sonnet-5-5"]); // each message once, its last record
  for (const p of [{ ...payload, agent_type: "Explore" }, { tool_name: "Bash" }]) {
    expect(repo.run("node", [HUB_PATH, "usage", "--hook"], JSON.stringify(p)).returncode).toBe(0); // not a crew agent: nothing
  }
  expect(events(repo, "--type", "usage").length).toBe(1);
  expect(tr(repo, "run", "--check").stdout).toContain("budget: project tokens: 213 used of 200");
});

it("usage of a resumed run counts its latest transcript once", () => {
  lifecycle(repo);
  repo.write(".crew/policy.yaml", LIFECYCLE + "budgets: { project: { max_tokens: 1 } }\n");
  agent(repo, "crew-qa", "qa");
  const more = { type: "assistant", message: { id: "m3", model: "claude-sonnet-5-5", usage: { input_tokens: 7, output_tokens: 20 } } };
  const first = repo.write("t1.jsonl", TRANSCRIPT.map((t) => JSON.stringify(t)).join("\n") + "\n");
  const second = repo.write("t2.jsonl", [...TRANSCRIPT, more].map((t) => JSON.stringify(t)).join("\n") + "\n");
  for (const path of [first, second]) {
    const payload = { hook_event_name: "SubagentStop", agent_type: "crew-qa", agent_id: "x9", agent_transcript_path: path };
    const r = repo.run("node", [HUB_PATH, "usage", "--hook"], JSON.stringify(payload));
    expect(r.returncode, r.stderr).toBe(0);
  }
  const usage = events(repo, "--type", "usage");
  expect(usage.map((e) => [e.run, e.tokens_in, e.tokens_out])).toEqual([["qa:x9", 113, 100], ["qa:x9", 120, 120]]);
  expect(tr(repo, "run", "--check").stdout).toContain("project tokens: 240 used of 1"); // not 213 + 240
});

it("the fast lane skips the architect but not QA", () => {
  lifecycle(repo);
  repo.write(".crew/policy.yaml", LIFECYCLE + "fast_lane: { types: [CHORE, BUG], max_tasks: 3 }\n");
  expect(newBug(repo).returncode).toBe(0);
  expect(as(repo, "pm", "triage", "BUG-001", "--priority", "P1", "--severity", "S2").returncode).toBe(0);
  const fix = PLAN_DRAFT.replace("## Test plan\n", "## Test plan\nA regression test for the 500.\n");
  expect(newPlan(repo, "Fix login 500", fix, "--items", "BUG-001").returncode).toBe(0);
  expect(newPlan(repo, "Signup", PLAN_DRAFT).returncode).toBe(0); // no fast-lane item
  expect(as(repo, "pm", "move", "P-001", "ready").returncode).toBe(0); // the PM specs a small bug fix
  let r = as(repo, "pm", "move", "P-002", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the architect role");
  as(repo, "pm", "assign", "P-001", "--to", "developer");
  repo.commit("chore(hub): fast lane");
  repo.env.CREW_RUN = "dev";
  expect(as(repo, "developer", "start", "P-001").returncode).toBe(0);
  ship(repo, "P-001");
  expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.env.CREW_RUN = "pm";
  r = as(repo, "pm", "move", "P-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("AC1 has no evidence"); // QA still verifies
  repo.env.CREW_RUN = "qa";
  as(repo, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all");
  repo.env.CREW_RUN = "pm";
  expect(as(repo, "pm", "move", "P-001", "done").returncode).toBe(0);
});
