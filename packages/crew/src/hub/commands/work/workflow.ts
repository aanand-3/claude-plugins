/** Status changes: validated transitions, starting a plan, progress logs. */
import { join } from "node:path";
import * as git from "../../core/git.js";
import type { Doc } from "../../core/work/doc.js";
import { decisionProblems, fastLane, learningsProblems, readinessProblems, triageProblems } from "../../core/work/gates.js";
import { overlapping, sharedGlobs } from "../../core/work/footprint.js";
import { approvalReason } from "../../core/team/policy.js";
import { commitWork, evidenceProblems, writeHandoff } from "./execution.js";
import { FORWARD, openQuestions } from "../team/questions.js";
import { goalProblems } from "./goals.js";
import { openPlanWorktree } from "./planning.js";
import { reviewProblems } from "./review.js";
import { bounces, escalateLimit, refuseWhilePaused } from "../team/liveness.js";
import { notify } from "../team/autonomy.js";
import { CLOSED, FLOWS, ITEM_CLOSED, type Kind } from "../../core/work/model.js";
import * as q from "../../core/work/queries.js";
import type { Store } from "../../core/store.js";
import { fail, kindOf, slugify, today } from "../../core/text.js";

const LOG_SECTION: Partial<Record<Kind, string>> = { item: "Notes" };

/** `via`: the step that causes this move and whose gate applies instead (a review sending a plan back: `plan.reviewed`). */
export function move(store: Store, docId: string, status: string, note?: string, force = false, approvedBy?: string, via?: string): Doc {
  store.require();
  docId = docId.toUpperCase();
  const kind = kindOf(docId);
  const doc = store.find(docId);
  const flow = FLOWS[kind!];
  const old = doc.get("status") ?? "";
  if (!Object.hasOwn(flow, status)) fail(`Unknown status '${status}'. Valid: ${Object.keys(flow).join(", ")}`);
  if (!(flow[old] ?? []).includes(status) && !force) {
    const allowed = [...(flow[old] ?? [])].sort().join(", ") || "none";
    fail(`${docId}: ${old} → ${status} not allowed (from ${old}: ${allowed}). Use --force to override.`);
  }
  if (!force) guard(store, kind!, doc, status, approvedBy);
  const waiting = FORWARD.has(status) ? openQuestions(store.ledger.events(), doc.id).filter((x) => x.blocking) : [];
  if (waiting.length && !force) {
    fail(`${doc.id} waits for an answer before it moves on:\n  - ${waiting.map((x) => `${x.id} → ${x.to}: ${x.text}`).join("\n  - ")}\n`
      + "(`crew.mjs questions`; --force to move anyway)");
  }
  if (kind === "plan" && status === "in-progress" && !via) assignedHere(store, doc.id);
  const lane = kind === "plan" && status === "ready" && fastLane(store, doc); // the PM may make a small one ready too
  authorize(store, doc.id, via ?? `${kind}.${status}`, approvedBy, via ? undefined : old, undefined, lane ? ["pm"] : []);
  if (kind === "plan" && status === "in-progress" && !via) claimFor(store, doc, force); // the developer's claim stays
  if (kind === "plan" && status === "in-review") commitWork(store, doc, `chore(${doc.id}): hand over to review`);
  stamp(kind!, doc, status);
  doc.set("status", status);
  if (kind === "plan" && status === "in-review" && doc.source === "worktree") writeHandoff(store, doc);
  if (kind === "plan" && old === "in-review" && status === "in-progress") { // counted with this move: escalated once over the limit
    escalateLimit(store, doc.id, bounces(store.ledger.events(), doc.id) + 1, store.policy.policy.limits.max_bounces, "came back from review");
  }
  const approval = approvedBy ? ` (approved by ${approvedBy})` : "";
  doc.appendLog(`status ${old} → ${status}` + (note ? ` — ${note}` : "") + approval, LOG_SECTION[kind!] ?? "Progress log");
  doc.save();
  store.ledger.record("move", doc.id, { from: old, to: status, ...(note ? { note } : {}), ...(approvedBy ? { approved_by: approvedBy } : {}),
    ...(via ? { via } : {}) });
  if (CLOSED.has(status) && store.ledger.claims().has(doc.id)) store.ledger.record("release", doc.id, { reason: status });
  if (kind === "goal" && status === "done") notify(store, "goal-done", doc.id, `${doc.id} is done: ${doc.get("title")}`);
  store.say(`${doc.id}: ${old} → ${status}`);
  return doc;
}

/** Policy: human gates and reserved decisions need a named human (`--approved-by`, CLI only); role gates need the role —
 * the gate on this exact edge (`plan.in-review>in-progress`) if there is one, else on the target (`plan.in-progress`).
 * --force never bypasses these, and an invalid policy refuses every move until it is fixed. */
export function authorize(store: Store, id: string, transition: string, approvedBy?: string, from?: string,
  cmd = `move ${id} ${transition.split(".")[1]}`, also: string[] = []): void {
  const { policy, errors } = store.policy;
  if (errors.length) fail(`The policy is invalid, so nothing moves until it is fixed (\`crew.mjs policy check\`):\n  - ${errors.join("\n  - ")}`);
  if (approvedBy !== undefined && !approvedBy.trim()) fail("--approved-by needs the approving person's name.");
  if (approvedBy) return;
  const reason = approvalReason(policy, transition);
  const [, status] = transition.split(".");
  if (reason) {
    fail(`${id} → ${status} is ${reason}: a human approves it with \`crew.mjs ${cmd} --approved-by <name>\` `
      + `(agents over MCP can't). Ask the ${policy.escalation.to} first.`);
  }
  const [kind] = transition.split(".");
  const role = (from ? policy.role_gates[`${kind}.${from}>${status}`] : undefined) ?? policy.role_gates[transition];
  const mine = store.ledger.who.role;
  if (role && mine !== role && !also.includes(mine ?? "")) fail(`${id} → ${status} is for the ${role} role; this run is ${mine ? `the ${mine} role` : "in no role"} (CREW_ROLE).`);
}

/** Whoever moves a plan into in-progress holds it: record the claim (another run's live claim refuses, unless forced). */
function claimFor(store: Store, doc: Doc, force: boolean): void {
  const held = store.ledger.claims().get(doc.id);
  if (held?.run === store.ledger.who.run) return;
  if (held && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. `
      + `Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  store.ledger.record("claim", doc.id, { branch: doc.get("branch") ?? "", ...(force ? { force: true } : {}) });
}

/** Why this run may not take on new work (budgets in the policy), or none. */
export function budgetProblems(store: Store): string[] {
  const { budgets } = store.policy.policy;
  const events = store.ledger.events(), me = store.ledger.who.run;
  const mine = store.ledger.spend(events.filter((e) => e.run === me)), all = store.ledger.spend(events);
  const over = (what: string, used: number, cap: number | null, unit = "") =>
    cap !== null && used >= cap ? [`${what}: ${unit}${+used.toFixed(2)} used of ${unit}${cap}`] : [];
  const holders = new Set([...store.ledger.claims(events).values()].map((c) => c.run));
  const agents = budgets.max_agents !== null && !holders.has(me) && holders.size >= budgets.max_agents
    ? [`max_agents: ${holders.size} runs already hold work (limit ${budgets.max_agents})`] : [];
  return [...over("run cost", mine.cost, budgets.run.max_cost, "$"), ...over("run tokens", mine.tokensIn + mine.tokensOut, budgets.run.max_tokens),
    ...over("project cost", all.cost, budgets.project.max_cost, "$"), ...over("project tokens", all.tokensIn + all.tokensOut, budgets.project.max_tokens),
    ...agents];
}

/** Refuse a transition whose gate isn't met (bypassed only with --force). */
function guard(store: Store, kind: Kind, doc: Doc, status: string, approvedBy?: string): void {
  let problems: string[] = [];
  let label = "";
  if (kind === "plan" && status === "ready") {
    problems = readinessProblems(store, doc);
    label = "is not ready (Definition of Ready)";
  } else if (kind === "plan" && status === "in-review") {
    problems = learningsProblems(doc, new Set(store.knowledge().map((e) => e.id)));
    label = "can't go to review";
  } else if (kind === "plan" && status === "done") {
    problems = [...doc.tasks().filter(([done]) => !done).map(([, t]) => `unchecked task: ${t}`),
      ...evidenceProblems(store, doc, approvedBy), ...reviewProblems(store, doc)];
    label = "can't be done";
  } else if (kind === "goal" && status === "done") {
    problems = goalProblems(store, doc);
    label = "isn't reached";
  } else if (kind === "goal" && status === "active") {
    problems = doc.missing(["Outcome", "Acceptance criteria"]).map((n) => `empty section: ${n}`);
    label = "can't be active";
  } else if (kind === "item" && status === "triaged") {
    problems = triageProblems(doc);
    label = "can't be triaged";
  } else if (kind === "idea" && status === "decided") {
    problems = decisionProblems(doc);
    label = "can't be decided";
  }
  if (problems.length) fail(`${doc.id} ${label}:\n  - ${problems.join("\n  - ")}\n(--force to override)`);
}

function stamp(kind: Kind, doc: Doc, status: string): void {
  if (kind === "plan" && status === "in-progress" && !doc.get("started")) doc.set("started", today());
  if (kind === "idea" && status === "decided") doc.set("decided", today());
  if (kind === "item" && ITEM_CLOSED.has(status)) doc.set("closed", today());
  if (status === "done") doc.set("completed", today());
}

export function start(store: Store, planId: string, force = false, approvedBy?: string): void {
  store.require();
  refuseWhilePaused(store, "new starts");
  let doc = store.find(planId);
  const branch = doc.get("branch") || `plan/${doc.id}-${slugify(doc.get("title") ?? "")}`;
  // its branch exists and nobody holds it (released or reassigned): this run takes the work over where it stopped
  const takeover = git.planBranches().includes(branch) && !store.ledger.claims().has(doc.id)
    && ["in-progress", "blocked"].includes(store.ledger.lastStatus().get(doc.id) ?? doc.get("status") ?? "");
  const held = store.ledger.claims().get(doc.id);
  if (held && held.run !== store.ledger.who.run && !force) {
    fail(`${doc.id} is claimed by ${held.actor} (${held.run}, ${held.worktree}) since ${held.ts.slice(0, 10)}. `
      + `Coordinate with them, or \`release ${doc.id} --force\` if that run is gone.`);
  }
  if (!force && !takeover) checkStartable(store, doc);
  const over = budgetProblems(store);
  if (over.length && !approvedBy) {
    fail(`Over budget — no new work without a human's approval (\`start ${doc.id} --approved-by <name>\`):\n  - ${over.join("\n  - ")}`);
  }
  const asked = openQuestions(store.ledger.events(), doc.id).filter((x) => x.blocking);
  if (asked.length && !force) { // refuse before the branch exists, not after
    fail(`${doc.id} waits for an answer before it starts:\n  - ${asked.map((x) => `${x.id} → ${x.to}: ${x.text}`).join("\n  - ")}\n`
      + "(`crew.mjs questions`; --force to start anyway)");
  }
  assignedHere(store, doc.id);
  authorize(store, doc.id, "plan.in-progress", approvedBy, "ready"); // every refusal that can happen now happens before the branch
  const shared = store.settings().plan_worktrees;
  // uncommitted hub files (the spec, moves) ride along to the plan branch and land in the plan's commit
  if (!shared && !git.treeIsClean(store.rel(store.dir))) fail("Working tree not clean. Commit or stash first (changes under the hub's directory may stay).");
  const focus = store.focus();
  if (!q.onFocus(doc, store.items(), focus)) store.say(`note: ${planId} does not serve the focus goal ${focus}`);
  const plans = store.plans(true);
  for (const o of overlapping(doc, plans, sharedGlobs(store)).filter((x) => plans.get(x.id)?.get("status") !== "ready")) {
    store.say(`warning: ${planId} overlaps ${o.id} (in progress) on ${o.globs.join(", ")} — expect conflicts at release; `
      + "narrow touches or list the file in hub.shared");
  }
  if (shared) { // the plan's shared worktree: no branch switch here
    // specced before plan_worktrees (or its worktree was removed): it gets one now, on its branch if that exists
    const home = store.planHome(doc.id) ?? openPlanWorktree(store, doc.id, branch);
    claimPlan(store, planId, branch, force, takeover, approvedBy);
    store.say(`${doc.id}: work in ${store.ws.rel(home) || "this checkout"} (${branch}) — claimed by ${store.ledger.who.actor} `
      + `(${store.ledger.who.run}); checkpoints commit its code on the branch`);
    return;
  }
  const from = git.currentBranch(), sha = git.git(["rev-parse", "HEAD"])?.trim();
  // a takeover may find the branch still checked out in the gone run's worktree
  git.git(takeover ? ["switch", "--ignore-other-worktrees", branch] : ["switch", "-c", branch], true);
  store.ws.onAbort(() => { // refused later (a gate on the branch, or a claim race at flush): leave no branch behind
    git.git(from ? ["switch", "-q", from] : ["switch", "-q", "--detach", sha ?? "HEAD"]);
    if (!takeover) git.git(["branch", "-D", branch]);
  });
  claimPlan(store, planId, branch, force, takeover, approvedBy); // re-reads the plan on the new branch
  store.say(`Switched to ${branch} — claimed by ${store.ledger.who.actor} (${store.ledger.who.run})`);
}

function claimPlan(store: Store, planId: string, branch: string, force: boolean, takeover: boolean, approvedBy?: string): void {
  const doc = store.find(planId);
  if (doc.get("status") === "draft" && force) {
    doc.set("status", "ready");
    doc.save();
  }
  store.ledger.record("claim", doc.id, { branch, ...(force ? { force: true } : {}), ...(takeover ? { takeover: true } : {}) });
  if (doc.get("status") !== "in-progress") move(store, planId, "in-progress", `branch ${branch}`, force, approvedBy);
  else store.say(`${doc.id}: taken over where it stopped — \`resume ${doc.id}\``);
}

/** A plan is started by the role it is assigned to; under a policy that gates assignment (`plan.assigned`), only once
 * assigned. Ownership, so --force doesn't skip it. */
export function assignedHere(store: Store, id: string): void {
  const a = store.ledger.assignments().get(id), me = store.ledger.who.role, by = store.policy.policy.role_gates["plan.assigned"];
  if (!a && by) fail(`${id} isn't assigned yet: the ${by} opens it with \`assign ${id} --to developer\`.`);
  if (a && a.to !== me) fail(`${id} is assigned to the ${a.to} role; this run is ${me ? `the ${me} role` : "in no role"}.`);
}

function checkStartable(store: Store, doc: Doc): void {
  if (doc.get("status") !== "ready") {
    fail(`${doc.id} is '${doc.get("status")}', not 'ready'. Refine it first or use --force.`);
  }
  const plans = store.plans(true);
  const waiting = q.unmetDeps(doc, plans);
  if (waiting.length) fail(`${doc.id} depends on unfinished plans: ${waiting.join(", ")}. (--force to start anyway)`);
  const limit = store.settings().wip_limit;
  const wip = myWip(store, plans);
  if (wip.length >= limit) {
    fail(`WIP limit (${limit}) reached: ${wip.join(", ")} in progress. Finish or block it first (--force to override).`);
  }
}

/** In-progress plans this run holds. WIP is per run (agent or session); unclaimed in-progress plans, from before
 * the ledger, count against every run until someone claims them. */
function myWip(store: Store, plans: Map<string, Doc>): string[] {
  const claims = store.ledger.claims();
  return [...plans.values()].filter((p) => p.get("status") === "in-progress"
    && (claims.get(p.id)?.run ?? store.ledger.who.run) === store.ledger.who.run).map((p) => p.id);
}

/** Give up a claim: the run is gone or the work is handed over. Another run's claim needs --force. */
export function release(store: Store, planId: string, note?: string, force = false): void {
  store.require();
  const id = planId.toUpperCase();
  const held = store.ledger.claims().get(id) ?? fail(`${id} is not claimed.`);
  if (held.run !== store.ledger.who.run && !force) {
    fail(`${id} is claimed by ${held.actor} (${held.run}), not this run. Use --force to release it anyway.`);
  }
  store.ledger.record("release", id, { reason: note ?? "released", from_run: held.run });
  store.say(`${id}: released (was ${held.actor}, ${held.run})`);
}

/** Token and cost use of a run, for budgets and the executive view. */
export function usage(store: Store, u: { tokensIn?: number; tokensOut?: number; cost?: number; model?: string; ref?: string }): void {
  store.require();
  if (u.tokensIn === undefined && u.tokensOut === undefined && u.cost === undefined) fail("Give --tokens-in, --tokens-out or --cost.");
  if (u.cost !== undefined && !(Number.isFinite(u.cost) && u.cost >= 0)) fail("--cost must be a number ≥ 0.");
  for (const [flag, n] of [["--tokens-in", u.tokensIn], ["--tokens-out", u.tokensOut]] as const) {
    if (n !== undefined && !(Number.isInteger(n) && n >= 0)) fail(`${flag} must be a whole number ≥ 0.`);
  }
  store.ledger.record("usage", u.ref ? u.ref.toUpperCase() : null, {
    tokens_in: u.tokensIn ?? 0, tokens_out: u.tokensOut ?? 0, cost: u.cost ?? 0, ...(u.model ? { model: u.model } : {}) });
  store.say(`usage recorded for ${store.ledger.who.actor} (${store.ledger.who.run})`);
  const over = budgetProblems(store);
  if (over.length) store.say(`warning: over budget — new work needs a human's approval: ${over.join("; ")}`);
}

export function log(store: Store, docId: string, text: string): void {
  const doc = store.find(docId);
  doc.appendLog(text, LOG_SECTION[kindOf(docId) ?? "plan"] ?? "Progress log");
  doc.save();
  store.ledger.record("log", doc.id, { text });
}
