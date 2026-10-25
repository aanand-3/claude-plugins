/** `dispatch` (P-031): the hub decides who works on what next — one {role, ref, task, resume} per actionable document, in
 * the table's priority order, cut to budgets.max_agents. */
import { beforeEach, expect, it } from "vitest";
import { join } from "node:path";
import { HUB, Repo } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { newGoal, newIdea, newPlan, planFile, read, tr, write } from "./helpers.js";
import { as, events, inReview, LIFECYCLE, lifecycle, started, type Json } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

function dispatch(role?: string): Json {
  const r = role ? as(repo, role, "dispatch", "--json") : tr(repo, "dispatch", "--json");
  expect(r.returncode, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
}
/** Each entry as "role ref task-verb". */
const brief = (d: Json) => d.entries.map((e: Json) => `${e.role} ${e.ref} ${e.task.split(" ")[0]}`);
const policy = (extra: string) => { repo.write(".crew/policy.yaml", LIFECYCLE + extra); repo.commit("chore(hub): policy"); };
const feat = (title: string, ...extra: string[]) => as(repo, "developer", "new-item", "feat", title, "--why", "a reason", ...extra);
const ok = (r: { returncode: number; stderr: string }) => expect(r.returncode, r.stderr).toBe(0);

/** A lifecycle project with G-001 active and focused (its breakdown gives FEAT-001 and FEAT-002). */
function focused(): void {
  lifecycle(repo);
  policy("budgets: { max_agents: 20 }\n");
  ok(newIdea(repo));
  ok(newGoal(repo));
  ok(tr(repo, "move", "G-001", "active", "--approved-by", "Amit"));
  ok(tr(repo, "focus", "G-001"));
}

it("items and specs: triage, spec a draft, write a plan for a focus item, an urgent bug first (AC1)", () => {
  focused(); // the breakdown's FEAT-001 and FEAT-002 are triaged, with no plan
  expect(brief(dispatch())).toEqual(["architect FEAT-001 write", "architect FEAT-002 write"]);
  ok(newGoal(repo, "Billing")); // FEAT-003 and FEAT-004, triaged on G-002
  ok(tr(repo, "move", "G-002", "active", "--approved-by", "Amit"));
  ok(newPlan(repo, "Signup endpoint", PLAN_DRAFT, "--goal", "G-001", "--items", "FEAT-001"));
  ok(feat("Remember me", "--goal", "G-001"));
  let d = dispatch();
  expect(brief(d)).toEqual(["pm FEAT-005 triage", "architect P-001 spec", "architect FEAT-002 write"]);
  expect(d.entries.map((e: Json) => e.ref)).not.toContain("FEAT-003"); // another goal's triaged FEAT waits
  ok(as(repo, "developer", "new-item", "bug", "Login 500", "--why", "500 on empty email", "--severity", "S1"));
  d = dispatch();
  expect(d.entries[0]).toMatchObject({ role: "pm", ref: "BUG-001" });
  expect(d.entries[0].task).toMatch(/^triage BUG-001/);
});

it("an urgent bug comes before release and review (AC1)", () => {
  inReview(repo);
  ok(as(repo, "developer", "new-item", "bug", "Login 500", "--why", "500 on empty email", "--severity", "S1"));
  expect(brief(dispatch())[0]).toBe("pm BUG-001 triage");
});

it("the plan pipeline: assign, start, continue, review, test, fix, complete, merge (AC2)", () => {
  lifecycle(repo);
  ok(newPlan(repo));
  ok(as(repo, "architect", "move", "P-001", "ready"));
  repo.commit("chore(hub): ready");
  expect(dispatch().entries).toEqual([{ role: "pm", ref: "P-001", task: expect.stringMatching(/^assign P-001 --to developer/), resume: null }]);
  ok(as(repo, "pm", "assign", "P-001", "--to", "developer"));
  expect(brief(dispatch())).toEqual(["developer P-001 start"]);
  repo.env.CREW_RUN = "dev";
  ok(as(repo, "developer", "start", "P-001"));
  expect(dispatch().entries).toEqual([{ role: "developer", ref: "P-001", task: expect.stringMatching(/^continue P-001/), resume: "dev" }]);
});

it("in review: architect review, then a failing check goes back to the implementer, then QA, then the PM accepts (AC2)", () => {
  inReview(repo); // QA's checks passed, no review yet
  expect(brief(dispatch())).toEqual(["architect P-001 review"]);
  repo.env.CREW_RUN = "arch";
  ok(as(repo, "architect", "review", "P-001", "--approve"));
  expect(brief(dispatch())).toEqual(["pm P-001 accept"]);
  repo.env.CREW_RUN = "qa";
  expect(as(repo, "qa", "checkpoint", "P-001", "--run", "false", "--ac", "all").returncode).toBe(1); // the check fails
  expect(dispatch().entries).toEqual([{ role: "developer", ref: "P-001", task: expect.stringMatching(/^fix P-001/), resume: "dev" }]);
});

it("approved with evidence missing → QA, resumed from its last run (AC2)", () => {
  inReview(repo);
  repo.env.CREW_RUN = "arch";
  ok(as(repo, "architect", "review", "P-001", "--approve"));
  repo.env.CREW_RUN = "qa-2";
  ok(as(repo, "qa", "checkpoint", "P-001", "--note", "looking"));
  // an added criterion has no evidence yet
  write(planFile(repo, "P-001"), read(planFile(repo, "P-001")).replace("- [ ] 201 on valid input", "- [ ] a second criterion\n- [ ] 201 on valid input"));
  const d = dispatch();
  expect(d.entries).toEqual([{ role: "qa", ref: "P-001", task: expect.stringMatching(/^test P-001/), resume: "qa-2" }]);
});

it("an accepted, unmerged plan goes to release (AC2)", () => {
  inReview(repo);
  repo.env.CREW_RUN = "arch";
  ok(as(repo, "architect", "review", "P-001", "--approve"));
  repo.env.CREW_RUN = "pm";
  ok(as(repo, "pm", "move", "P-001", "accepted"));
  repo.commit("chore(P-001): accepted");
  repo.git("switch", "-q", "main");
  expect(dispatch().entries).toEqual([{ role: "release", ref: "P-001", task: expect.stringMatching(/^land P-001/), resume: null }]);
});

it("exceptions go to the Director: stale claims, blocked plans, the next focus, a stall (AC3)", () => {
  started(repo, "dev-1");
  repo.commit("chore(P-001): start");
  repo.git("switch", "-q", "main");
  policy("limits: { stale_claim_hours: 0 }\n");
  expect(brief(dispatch())).toEqual(["director P-001 reassign"]);
});

it("a blocked plan → director unblock (AC3)", () => {
  started(repo);
  ok(as(repo, "developer", "move", "P-001", "blocked", "--note", "waiting on a vendor"));
  expect(brief(dispatch())).toEqual(["director P-001 unblock"]);
});

it("an idle run → director: resume or reassign (P-034 AC10)", () => {
  started(repo);
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  repo.write(".git/crew/activity.jsonl", `${JSON.stringify({ ts: ago(30), run: "developer:a1", role: "developer", ref: "P-001", tool: "Edit", target: "src/a.ts" })}\n`);
  const d = dispatch();
  expect(d.entries[0]).toMatchObject({ role: "director", ref: "P-001" });
  expect(d.entries[0].task).toMatch(/^run developer:a1 on P-001 idle for 30 min: resume or reassign$/);
  policy("limits: { idle_minutes: 45 }\n"); // not idle yet: the developer continues
  expect(brief(dispatch())).toEqual(["developer P-001 continue"]);
});

it("a focus goal that is done while another goal is active → director focus (AC3)", () => {
  lifecycle(repo);
  ok(newIdea(repo));
  ok(newGoal(repo));
  ok(newGoal(repo, "Billing"));
  for (const g of ["G-001", "G-002"]) ok(tr(repo, "move", g, "active", "--approved-by", "Amit"));
  ok(tr(repo, "focus", "G-001"));
  ok(tr(repo, "move", "G-001", "done", "--force", "--approved-by", "Amit"));
  const d = dispatch();
  expect(d.entries[0]).toMatchObject({ role: "director", ref: "G-002" });
  expect(d.entries[0].task).toMatch(/^focus G-002/);
});

it("open work that can't move → one stall entry for the Director (AC3)", () => {
  lifecycle(repo);
  ok(newPlan(repo));
  ok(newPlan(repo, "Login", PLAN_DRAFT, "--touches", "src/login/**", "--depends", "P-001"));
  for (const p of ["P-001", "P-002"]) ok(as(repo, "architect", "move", p, "ready"));
  ok(as(repo, "pm", "escalate", "P-001", "Ship it at all?"));
  repo.commit("chore(hub): plans");
  const d = dispatch();
  expect(brief(d)).toEqual(["director null stall:"]);
  expect(d.entries[0].task).toContain("depends on P-001");
});

it("questions: to a role, and a human's to the director; escalations and what they hold give none (AC4)", () => {
  lifecycle(repo);
  ok(newPlan(repo));
  ok(as(repo, "developer", "ask", "P-001", "--to", "architect", "Which status code for a duplicate?"));
  ok(tr(repo, "ask", "--to", "director", "How is it going?"));
  const qs = events(repo, "--type", "ask").map((e: Json) => e.qid);
  const d = dispatch();
  expect(d.entries.map((e: Json) => [e.role, e.task.split(":")[0]])).toEqual([
    ["architect", `answer ${qs[0]} about P-001`], ["director", `answer ${qs[1]}`]]); // P-001 waits for its answer
  for (const q of qs) tr(repo, "answer", q, "ok", "--approved-by", "Amit");
  ok(as(repo, "pm", "escalate", "P-001", "Drop it?"));
  // the escalation is the human's and holds P-001: neither gets an entry (only the Director's stall report)
  expect(dispatch().entries.filter((e: Json) => e.ref === "P-001" || e.task.startsWith("answer"))).toEqual([]);
});

it("the cap: max_agents entries, the rest counted; no cap without max_agents (AC5)", () => {
  lifecycle(repo);
  policy("budgets: { max_agents: 2 }\n");
  for (const t of ["One", "Two", "Three", "Four"]) ok(feat(t));
  let d = dispatch();
  expect(d.max_agents).toBe(2);
  expect(d.entries.map((e: Json) => e.ref)).toEqual(["FEAT-001", "FEAT-002"]);
  expect(d.more).toBe(2);
  policy("budgets: { max_agents: 10 }\n"); // the policy has no way to say "no max_agents": a cap above the work cuts nothing
  d = dispatch();
  expect(d.max_agents).toBe(10);
  expect(d.entries.map((e: Json) => e.ref)).toEqual(["FEAT-001", "FEAT-002", "FEAT-003", "FEAT-004"]);
  expect(d.more).toBe(0);
  const refs = d.entries.map((e: Json) => e.ref);
  expect(new Set(refs).size).toBe(refs.length);
});

it("the spec frontier: no spec while ready, unclaimed plans fill max_agents (AC6)", () => {
  lifecycle(repo);
  policy("budgets: { max_agents: 2 }\n");
  for (const t of ["One", "Two", "Three", "Four"]) ok(newPlan(repo, t, PLAN_DRAFT, "--touches", `src/${t}/**`));
  ok(as(repo, "architect", "move", "P-001", "ready"));
  expect(brief(dispatch()).filter((b: string) => b.startsWith("architect"))).toEqual(["architect P-002 spec"]);
  ok(as(repo, "architect", "move", "P-002", "ready"));
  expect(brief(dispatch()).filter((b: string) => b.startsWith("architect"))).toEqual([]);
});

it("paused: no entries, the reason, and the text says so (AC7)", () => {
  lifecycle(repo);
  ok(newPlan(repo));
  ok(tr(repo, "pause", "--reason", "x"));
  expect(dispatch()).toEqual({ max_agents: 4, paused: "x", entries: [], more: 0 });
  expect(tr(repo, "dispatch").stdout).toContain("the team is paused (x)");
});

it("the text form: one DISPATCH line per entry and the count cut (AC7)", () => {
  lifecycle(repo);
  policy("budgets: { max_agents: 1 }\n");
  for (const t of ["One", "Two"]) ok(feat(t));
  const out = tr(repo, "dispatch").stdout;
  expect(out).toMatch(/^DISPATCH {2}pm {2}FEAT-001 {2}triage FEAT-001/m);
  expect(out).toContain("… and 1 more (budgets.max_agents)");
});

it("mcp: the dispatch tool returns the same JSON as dispatch --json, and help lists it (AC9)", () => {
  lifecycle(repo);
  ok(newPlan(repo));
  ok(feat("Remember me"));
  const rpc = (id: number, method: string, params: object) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
  const input = [rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "0" } }),
    rpc(2, "tools/call", { name: "dispatch", arguments: {} })].join("\n") + "\n";
  const r = repo.node(join(HUB, "..", "mcp.mjs"), [], input);
  const reply = r.stdout.split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((m) => m.id === 2);
  expect(reply.result.isError, JSON.stringify(reply)).toBe(false);
  expect(JSON.parse(reply.result.content[0].text)).toEqual(dispatch());
  expect(tr(repo, "help").stdout).toMatch(/^ {2}dispatch \[--json\]/m);
});

it("goal closure: a focus goal with nothing open goes to the PM, who closes it; the Director can't (AC8)", () => {
  focused();
  for (const i of ["FEAT-001", "FEAT-002"]) ok(as(repo, "pm", "triage", i, "--reject", "wontfix", "--note", "out of this goal"));
  expect(dispatch().entries).toEqual([{ role: "pm", ref: "G-001", task: expect.stringMatching(/^close G-001/), resume: null }]);
  repo.env.CREW_RUN = "pm";
  ok(as(repo, "pm", "checkpoint", "G-001", "--verify", "signed up as a new user", "--result", "pass", "--ac", "all"));
  const r = as(repo, "director", "move", "G-001", "done");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the pm role");
  ok(as(repo, "pm", "move", "G-001", "done"));
  expect(tr(repo, "policy", "show").stdout).toMatch(/role_gates goal\.done +pm/);
});
