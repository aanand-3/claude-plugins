/** Running the team: `assign` (the PM opens a ready plan for a role, which `start` then requires) and `staff` (the Director's
 * view of what can run in parallel now: the ready, non-overlapping frontier within `budgets.max_agents`, routed to teams). */
import type { Doc } from "../../core/work/doc.js";
import { globsOverlap } from "../../core/memory/knowledge.js";
import { blockingGlobs, sharedGlobs } from "../../core/work/footprint.js";
import * as q from "../../core/work/queries.js";
import type { Store } from "../../core/store.js";
import { byKey, fail } from "../../core/text.js";
import { refuseWhilePaused, staleClaims } from "./liveness.js";
import { openQuestions } from "./questions.js";
import { authorize } from "../work/workflow.js";

const ACTIVE = new Set(["in-progress", "blocked", "in-review"]);

export function assign(store: Store, planId: string, to: string, team?: string, note?: string, approvedBy?: string): void {
  store.require();
  const doc = store.find(store.checkRef(planId, "plan"));
  const { roles, teams } = store.policy;
  if (!roles.includes(to)) fail(`'${to}' is not a role (${roles.join(", ")}).`);
  if (team && !Object.hasOwn(teams, team)) fail(`team '${team}' is not defined under teams: in .crew/policy.yaml.`);
  if (doc.get("status") !== "ready") fail(`${doc.id} is '${doc.get("status")}': only a ready plan is assigned (\`move ${doc.id} ready\` first).`);
  authorize(store, doc.id, "plan.assigned", approvedBy, undefined, `assign ${doc.id} --to ${to}`);
  doc.set("assignee", team ? `${to} (team ${team})` : to);
  doc.appendLog(`assigned to the ${to} role${team ? `, team ${team}` : ""}${note ? ` — ${note}` : ""}`, "Progress log");
  doc.save();
  store.ledger.record("assign", doc.id, { to, ...(team ? { team } : {}), ...(note ? { note } : {}),
    ...(approvedBy ? { approved_by: approvedBy } : {}) });
  store.say(`${doc.id}: assigned to the ${to} role${team ? `, team ${team}` : ""}`);
}

/** Move stuck work to another run: release the claim (only a stale one, unless --force) and assign the plan again. The new
 * agent takes it over with `start`, which resumes the plan's branch where it stopped. */
export function reassign(store: Store, planId: string, to?: string, note?: string, force = false, approvedBy?: string): void {
  store.require();
  const id = store.checkRef(planId, "plan");
  store.find(id);
  const events = store.ledger.events(), claim = store.ledger.claims(events).get(id), was = store.ledger.assignments(events).get(id);
  const target = to ?? (was?.to as string | undefined) ?? "developer";
  if (!store.policy.roles.includes(target)) fail(`'${target}' is not a role (${store.policy.roles.join(", ")}).`);
  if (!claim && !was) fail(`${id} is neither claimed nor assigned: \`assign\` it instead.`);
  authorize(store, id, "plan.reassigned", approvedBy, undefined, `reassign ${id}`);
  if (claim && !force && !staleClaims(store, events).some((s) => s.ref === id)) {
    fail(`${id} is held by ${claim.actor} (${claim.run}) and not stale (limits.stale_claim_hours). Reassign stale work, or --force.`);
  }
  if (claim) store.ledger.record("release", id, { reason: "reassigned", from_run: claim.run });
  store.ledger.record("assign", id, { to: target, reassigned: true, ...(note ? { note } : {}), ...(approvedBy ? { approved_by: approvedBy } : {}) });
  store.say(`${id}: reassigned to the ${target} role${claim ? ` (released ${claim.actor}, ${claim.run})` : ""} — `
    + `the next ${target} takes it over with \`start ${id}\`, which resumes its branch`);
}

export interface Staffing {
  free: number | null;                  // agents that may start now (null: no max_agents)
  start: { id: string; title: string; team: string | null; assigned: string | null }[];
  waiting: { id: string; why: string }[];
}

/** The team a plan belongs to: the one whose scope covers all of its touches, else the one covering most, else none. */
function teamFor(plan: Doc, teams: Record<string, string[]>): string | null {
  const touches = plan.touches();
  const score = (scope: string[]) => touches.filter((t) => scope.some((s) => globsOverlap(t, s))).length;
  const best = Object.entries(teams).filter(([, s]) => s.length && score(s) > 0).sort(byKey(([n, s]) => [-score(s), n]))[0];
  return best?.[0] ?? null;
}

export function staffing(store: Store): Staffing {
  const plans = store.plans(true), items = store.items(), goals = store.goals(), focus = store.focus();
  const events = store.ledger.events(), assigned = store.ledger.assignments(events);
  const holders = new Set([...store.ledger.claims(events).values()].map((c) => c.run)); // runs holding work
  const max = store.policy.policy.budgets.max_agents;
  const free = max === null ? null : Math.max(0, max - holders.size);
  const order = new Map(q.ranked(items, goals, focus).map((it, i) => [it.id, i]));
  const rank = (p: Doc) => Math.min(...q.planItems(p, items).map((it) => order.get(it.id) ?? Infinity), Infinity);
  // the ledger knows a plan moved on even where its file (another branch) doesn't yet
  const moved = store.ledger.lastStatus(events), claims = store.ledger.claims(events);
  const st = (p: Doc) => (claims.has(p.id) ? "in-progress" : moved.get(p.id) ?? p.get("status") ?? "");
  const ready = [...plans.values()].filter((p) => st(p) === "ready")
    .sort(byKey((p) => [!q.onFocus(p, items, focus), rank(p), p.id]));
  const busy = [...plans.values()].filter((p) => ACTIVE.has(st(p)));
  const out: Staffing = { free, start: [], waiting: [] };
  const shared = sharedGlobs(store); // overlaps only on hub.shared touches never block
  const clash = (p: Doc, others: Doc[]) => others.find((o) => blockingGlobs(p, o, shared).length);
  for (const p of ready) {
    const deps = q.unmetDeps(p, plans), blocked = openQuestions(events, p.id).filter((x) => x.blocking);
    const hit = clash(p, [...busy, ...out.start.map((s) => plans.get(s.id)!)]);
    const why = deps.length ? `depends on ${deps.join(", ")}` : blocked.length ? `waits for an answer (${blocked.map((x) => x.id).join(", ")})`
      : hit ? `overlaps ${hit.id} on its touches` : free !== null && out.start.length >= free ? "no free agent (budgets.max_agents)" : "";
    if (why) out.waiting.push({ id: p.id, why });
    else out.start.push({ id: p.id, title: p.get("title") ?? "", team: teamFor(p, store.policy.teams), assigned: assigned.get(p.id)?.to as string ?? null });
  }
  return out;
}

export function staff(store: Store, json = false): void {
  store.require();
  refuseWhilePaused(store, "new staffing");
  const s = staffing(store);
  if (json) {
    store.say(JSON.stringify(s, null, 2));
    return;
  }
  store.say(s.free === null ? "Staffing (no max_agents):" : `Staffing: ${s.free} agent${s.free === 1 ? "" : "s"} free (budgets.max_agents).`);
  for (const p of s.start) {
    const team = p.team ? ` --team ${p.team}` : "";
    store.say(`  START  ${p.id}: ${p.title}${p.team ? ` [team ${p.team}]` : ""} → `
      + (p.assigned ? `assigned to ${p.assigned}: hand it to a ${p.assigned} agent` : `PM: assign ${p.id} --to developer${team}`));
  }
  for (const w of s.waiting) store.say(`  WAIT   ${w.id}: ${w.why}`);
  if (!s.start.length && !s.waiting.length) store.say("  nothing ready to start — the PM ranks, the Architect specs the next plans");
}
