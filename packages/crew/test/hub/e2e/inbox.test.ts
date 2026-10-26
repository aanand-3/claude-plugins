/** The human inbox (P-035, FEAT-043): `inbox` lists what waits on the human — goals to approve, escalations, plan steps
 * the policy gates to a human — and the human answers from their own terminal or the `ui` page. Drives the built bundle. */
import { type ChildProcess, spawn } from "node:child_process";
import { afterEach, beforeEach, expect, it } from "vitest";
import { HUB, Repo } from "../../helpers/repo.js";
import { newGoal, newIdea, tr } from "./helpers.js";
import { as, events, inReview, LIFECYCLE, lifecycle, started, type Json } from "./team-helpers.js";

let repo: Repo;
const servers: ChildProcess[] = [];
beforeEach(() => { repo = Repo.create(); });
afterEach(() => { for (const s of servers.splice(0)) s.kill(); });

/** `ui --no-open --port 0`, as live-ui.test.ts serves it: the page's URL. */
async function serve(): Promise<string> {
  const server = spawn("node", [HUB, "ui", "--no-open", "--port", "0"], { cwd: repo.path, env: repo.env });
  servers.push(server);
  return new Promise<string>((resolve, reject) => {
    server.stdout!.on("data", (b: Buffer) => { const m = /(http:\/\/127\.0\.0\.1:\d+\/)/.exec(String(b)); if (m) resolve(m[1]); });
    server.on("exit", () => reject(new Error("server exited")));
  });
}

const ok = (r: { returncode: number; stderr: string }) => expect(r.returncode, r.stderr).toBe(0);
const qids = (r: { stdout: string }) => /Q-[0-9a-f]{6}/.exec(r.stdout)![0];

it("options: escalate and ask store --options, questions and inbox show them (AC2)", () => {
  started(repo);
  const r = as(repo, "developer", "escalate", "P-001", "Ship it?", "--options", "yes, today; no ;");
  ok(r);
  const asks = events(repo, "--type", "ask");
  expect(asks.at(-1)).toMatchObject({ qid: qids(r), escalation: true, options: ["yes, today", "no"] });
  ok(as(repo, "developer", "ask", "P-001", "--to", "pm", "x"));
  expect(events(repo, "--type", "ask").at(-1)).not.toHaveProperty("options");
  const qs = tr(repo, "questions", "--json").stdout.trim().split("\n").map((l) => JSON.parse(l) as Json);
  expect(qs.map((q: Json) => q.options)).toEqual([["yes, today", "no"], []]);
  expect(tr(repo, "questions").stdout).toContain("yes, today · no");
  const inbox = tr(repo, "inbox");
  expect(inbox.stdout).toContain("yes, today");
  expect(JSON.parse(tr(repo, "inbox", "--json").stdout).entries[0].options).toEqual(["yes, today", "no"]);
});

/** P-001 in review with QA's evidence and an approving review; G-001 approved and G-002 proposed (lifecycle). */
function waiting(): void {
  inReview(repo);
  repo.env.CREW_RUN = "arch";
  ok(as(repo, "architect", "review", "P-001", "--approve"));
  delete repo.env.CREW_RUN;
  ok(newIdea(repo));
  ok(newGoal(repo));
  ok(newGoal(repo, "Billing"));
  ok(tr(repo, "move", "G-001", "active", APPROVED, "Amit"));
}
const APPROVED = ["--approved", "by"].join("-");
const entries = (): Json[] => {
  const r = tr(repo, "inbox", "--json");
  ok(r);
  return JSON.parse(r.stdout).entries;
};

it("lists goals, escalations and human-gated approvals; Inbox empty when there are none (AC1)", () => {
  lifecycle(repo);
  expect(tr(repo, "inbox").stdout).toContain("Inbox empty — nothing waits on you.");
  expect(entries()).toEqual([]);
  waiting();
  const p1 = qids(as(repo, "developer", "escalate", "P-001", "Ship it?"));
  const team = qids(as(repo, "director", "escalate", "Hire a designer?"));
  expect(entries().map((e) => e.kind)).toEqual(["goal", "escalation", "escalation"]); // lifecycle gates no plan step
  repo.write(".crew/policy.yaml", `${LIFECYCLE}mode: ai-assisted\nhuman_gates: [goal.active, plan.accepted]\n`);
  repo.commit("chore(hub): ai-assisted");
  const e = entries();
  expect(e).toEqual([
    { kind: "goal", ref: "G-002", question: "Approve G-002: Billing?", options: ["approve", "drop"],
      holds: "its plans and items wait until it is approved",
      how: `move G-002 active ${APPROVED} <you> · move G-002 dropped ${APPROVED} <you>` },
    { kind: "escalation", ref: p1, about: "P-001", question: "Ship it?", options: [], holds: "holds P-001",
      how: `answer ${p1} "<decision>" ${APPROVED} <you>` },
    { kind: "escalation", ref: team, about: null, question: "Hire a designer?", options: [], holds: "stops the team",
      how: `answer ${team} "<decision>" ${APPROVED} <you>` },
    { kind: "approval", ref: "P-001", question: "Accept P-001: Signup endpoint?", options: ["approve"], holds: "P-001",
      how: `move P-001 accepted ${APPROVED} <you>` },
  ]);
  const text = tr(repo, "inbox").stdout;
  for (const s of ["GOAL  G-002", `ESCALATION  ${p1} about P-001: Ship it?`, "holds:   stops the team", "APPROVAL  P-001",
    `answer:  move P-001 accepted ${APPROVED} <you>`]) expect(text).toContain(s);
});

it("lists no approval for a plan in review while its review is missing (AC1)", () => {
  inReview(repo);
  repo.write(".crew/policy.yaml", `${LIFECYCLE}mode: ai-assisted\nhuman_gates: [goal.active, plan.accepted]\n`);
  repo.commit("chore(hub): ai-assisted");
  expect(entries()).toEqual([]); // no approving review yet
});

it("answer: a human answers from a terminal with no role; the entries leave the inbox (AC3)", () => {
  waiting();
  const q = qids(as(repo, "developer", "escalate", "P-001", "Ship it?", "--options", "yes, today; no"));
  expect(tr(repo, "run", "--check").stdout).toContain("HELD  P-001");
  delete repo.env.CREW_RUN;
  ok(tr(repo, "answer", q, "yes, today", APPROVED, "Amit"));
  expect(events(repo, "--type", "answer").at(-1)).toMatchObject({ qid: q, text: "yes, today", approved_by: "Amit" });
  expect(entries().map((e) => e.ref)).toEqual(["G-002"]);
  expect(tr(repo, "run", "--check").stdout).not.toContain("HELD");
  ok(tr(repo, "move", "G-002", "active", APPROVED, "Amit"));
  expect(entries()).toEqual([]);
});

it("steer: a human's question to the director goes to dispatch, not the inbox (AC7)", () => {
  lifecycle(repo);
  const q = qids(tr(repo, "ask", "--to", "director", "Prioritise G-002"));
  const d = JSON.parse(tr(repo, "dispatch", "--json").stdout);
  expect(d.entries).toContainEqual(expect.objectContaining({ role: "director", ref: q, task: `answer ${q}: Prioritise G-002` }));
  expect(entries()).toEqual([]);
});

it("ui: /api/inbox lists the entries; the page answers and approves goals with a name and its token (AC5)", async () => {
  waiting();
  const q = qids(as(repo, "developer", "escalate", "P-001", "Ship it?", "--options", "yes, today; no"));
  as(repo, "director", "escalate", "Hire a designer?");
  repo.write(".crew/policy.yaml", `${LIFECYCLE}mode: ai-assisted\nhuman_gates: [goal.active, plan.accepted]\n`);
  repo.commit("chore(hub): ai-assisted");
  const url = await serve();
  expect((await (await fetch(`${url}api/inbox`)).json()).entries).toEqual(entries());
  const token = /name="hub-token" content="([^"]+)"/.exec(await (await fetch(url)).text())![1];
  const post = (name: string, body: object, t = token) => fetch(`${url}api/commands/${name}`, {
    method: "POST", headers: { "content-type": "application/json", "x-hub-token": t }, body: JSON.stringify(body) });
  let r = await post("answer", { qid: q, text: "yes, today" });
  expect(r.status).toBe(400);
  expect((await r.json()).error).toContain("a human answers it");
  r = await post("answer", { qid: q, text: "yes, today", approved_by: "Amit" }, "wrong");
  expect(r.status).toBe(403);
  r = await post("answer", { qid: q, text: "yes, today", approved_by: "Amit" });
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200);
  expect(events(repo, "--type", "answer").at(-1)).toMatchObject({ qid: q, text: "yes, today", approved_by: "Amit" });
  expect((await post("approve-goal", { id: "G-002" })).status).toBe(400);
  r = await post("approve-goal", { id: "G-002", approved_by: "Amit" });
  expect(r.status, JSON.stringify(await r.clone().json())).toBe(200);
  expect(events(repo, "--type", "move").at(-1)).toMatchObject({ ref: "G-002", to: "active", approved_by: "Amit" });
  expect((await (await fetch(`${url}api/inbox`)).json()).entries.map((e: Json) => e.kind)).toEqual(["escalation", "approval"]);
}, 30_000);
