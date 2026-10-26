/** The hub, end to end — context, roles and questions: the context budget and role order, asks and escalations,
 * overlapping plans, role queues and the SessionStart hook. Ported from tests/crew/test_hub.py (section "context, roles
 * and questions"). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo, SKILLS } from "../../helpers/repo.js";
import { PLAN_DRAFT } from "./fixtures.js";
import { init, newIdea, newPlan, planFile, read, tr, write } from "./helpers.js";
import { knowledge, mcpCall, readyPlan, sectionOrder, started } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

it("context stays within budget in role order", () => {
  started(repo);
  tr(repo, "learn", "gotcha", "Signup needs the mail mock", "--why", "tests hang without it", "--scope", "src/auth/**");
  tr(repo, "checkpoint", "--run", "true", "--ac", "1");
  const out = tr(repo, "context").stdout; // the plan of this branch, the default (developer) slice
  expect(out.startsWith("crew context — P-001: Signup [in-progress]")).toBe(true);
  expect(sectionOrder(out)).toEqual(["Where the work stands", "Goal", "Acceptance criteria", "Remaining tasks",
    "Knowledge in scope", "Handoff & log"]);
  expect(out).toContain("AC1 ✓ self 201 on valid input");
  expect(out).toContain("Signup needs the mail mock");
  const qa = JSON.parse(tr(repo, "context", "P-001", "--role", "qa", "--json").stdout).text;
  expect(sectionOrder(qa).slice(0, 3)).toEqual(["Goal", "Acceptance criteria", "Test plan"]);
  const arch = tr(repo, "context", "P-001", "--role", "architect").stdout;
  const archOrder = sectionOrder(arch);
  expect((archOrder[0] === "Goal" && archOrder[1] === "Approach") || archOrder[0] === "Goal").toBe(true);
  for (const budget of [300, 600, 1000]) {
    const text: string = JSON.parse(tr(repo, "context", "P-001", "--role", "qa", "--budget", String(budget), "--json").stdout).text;
    expect([...text].length, `${budget}`).toBeLessThanOrEqual(budget);
  }
  const small: string = JSON.parse(tr(repo, "context", "P-001", "--budget", "400", "--json").stdout).text;
  expect(small.includes("(more: crew.mjs") || small.includes("… also:")).toBe(true); // what doesn't fit becomes a pointer
  expect(tr(repo, "context", "--budget", "50").returncode).not.toBe(0);
  expect(tr(repo, "context", "--role", "wizard").returncode).not.toBe(0);
  repo.git("switch", "-q", "main");
  const project = tr(repo, "context", "--role", "director").stdout;
  expect(sectionOrder(project).slice(0, 2)).toEqual(["Idea & focus", "Next for director"]);
  expect(project).toContain("P-001 held by developer (dev-run)");
});

it("an ask blocks only its plan", () => {
  init(repo, { commit: true });
  readyPlan(repo, "One");
  readyPlan(repo, "Two");
  repo.commit("chore(hub): plans");
  let r = tr(repo, "ask", "P-001", "--to", "architect", "Postgres or SQLite for sessions?");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("blocks P-001 until answered");
  const qid = r.stdout.match(/Q-[0-9a-f]{6}/)![0];
  r = tr(repo, "start", "P-001");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("P-001 waits for an answer");
  expect(r.stderr).toContain(qid);
  expect(repo.git("branch").stdout).not.toContain("plan/P-001-one"); // refused before any branch was made
  expect(tr(repo, "ask", "P-002", "--to", "pm", "FYI: copy changes", "--fyi").returncode).toBe(0);
  repo.env.CREW_RUN = "dev-2";
  expect(tr(repo, "start", "P-002").returncode).toBe(0); // other plans move on (an fyi question doesn't block)
  repo.commit("chore(P-002): start");
  repo.git("switch", "-q", "main");
  expect(tr(repo, "next", "--role", "architect").stdout).toContain(`QUESTION     ${qid}`);
  Object.assign(repo.env, { CREW_RUN: "architect-run", CREW_ROLE: "architect" }); // the addressed role answers
  const res = mcpCall(repo, "answer", { id: qid, text: "Postgres: one database to run", decision: true, scope: "src/**" });
  expect(res.isError, JSON.stringify(res)).toBeFalsy();
  delete repo.env.CREW_ROLE;
  expect(Object.values(knowledge(repo)).some((t) => t.includes("title: Postgres: one database to run") && t.includes("source: P-001")))
    .toBe(true);
  repo.commit("chore(hub): decision"); // the answer became a knowledge entry
  repo.env.CREW_RUN = "dev-1";
  expect(tr(repo, "start", "P-001").returncode).toBe(0);
  expect(tr(repo, "answer", qid, "again").returncode).not.toBe(0); // already answered
});

it("escalations need a human", () => {
  init(repo, { commit: true });
  newIdea(repo);
  let r = tr(repo, "escalate", "IDEA", "Pilot slipped two weeks: cut reminders or move the date?");
  const qid = r.stdout.match(/Q-[0-9a-f]{6}/)![0];
  expect(r.stdout).toContain("→ executive");
  expect(tr(repo, "next", "--role", "executive").stdout).toContain(`answer ${qid}`);
  expect(tr(repo, "next", "--role", "director").stdout).toContain("waiting on the executive");
  expect(tr(repo, "status").stdout).toContain("**escalation**");
  expect(mcpCall(repo, "answer", { id: qid, text: "cut reminders" }).isError).toBeTruthy();
  r = tr(repo, "answer", qid, "cut reminders");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("a human answers it");
  expect(tr(repo, "answer", qid, "cut reminders", "--approved-by", "Amit").returncode).toBe(0);
  expect(tr(repo, "questions").stdout).toContain("No open questions.");
  expect(tr(repo, "questions", "--all").stdout).toContain("answered by Amit: cut reminders");
  expect(tr(repo, "ask", "--to", "wizard", "x").returncode).not.toBe(0);
});

it("overlapping plans warn and drift is flagged", () => {
  init(repo, { commit: true });
  repo.write("src/auth/login.py", "x\n");
  newPlan(repo, "Login", PLAN_DRAFT, "--touches", "src/auth/**");
  newPlan(repo, "Sessions", PLAN_DRAFT, "--touches", "src/auth/session.py");
  for (const pid of ["P-001", "P-002"]) tr(repo, "move", pid, "ready");
  repo.commit("chore(hub): plans");
  repo.env.CREW_RUN = "a";
  tr(repo, "start", "P-001");
  repo.write("docs/notes.md", "outside\n");
  repo.commit("feat(P-001): wip");
  expect(tr(repo, "check").stdout).toContain("P-001: changes outside its touches: docs/notes.md");
  repo.git("switch", "-q", "main");
  repo.env.CREW_RUN = "b";
  const r = tr(repo, "start", "P-002");
  expect(r.returncode).toBe(0);
  expect(r.stdout).toContain("warning: P-002 overlaps P-001 (in progress) on src/auth/**");
  expect(tr(repo, "check").stdout).toContain("P-001 and P-002 are both active and overlap on src/auth/session.py");
});

it("role queues", () => {
  started(repo);
  const p = planFile(repo, "P-001");
  write(p, read(p).replaceAll("- [ ] T", "- [x] T").trimEnd() + "\nShipped.\nLearnings: none\n");
  tr(repo, "move", "P-001", "in-review");
  repo.env.CREW_RUN = "qa-run";
  expect(tr(repo, "next", "--role", "qa").stdout).toContain("verify P-001: AC1");
  tr(repo, "checkpoint", "P-001", "--run", "true", "--ac", "all");
  expect(tr(repo, "next", "--role", "qa").stdout).toContain("P-001: evidence complete → move P-001 accepted");
  expect(tr(repo, "next", "--role", "wizard").returncode).not.toBe(0);
  expect(tr(repo, "next", "--role", "release").stdout).toContain("nothing for the release role");
});

it("the SessionStart hook runs context", () => {
  const settings = JSON.parse(readFileSync(join(SKILLS, "guidelines/templates/settings.json"), "utf8"));
  const start = settings.hooks.SessionStart[0].hooks.map((h: { command: string }) => h.command).join("\n");
  expect(start).toContain("crew.mjs context");
  expect(start).not.toContain("crew.mjs current");
  for (const event of ["Stop", "PreCompact"]) expect(settings.hooks[event][0].hooks[0].command).toContain("checkpoint --auto");
});
