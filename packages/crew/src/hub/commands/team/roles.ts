/** `next --role R`: each role's own queue. Questions addressed to the role come first, then its work, most urgent first. */
import type { Doc } from "../../core/work/doc.js";
import { overlapping, sharedGlobs } from "../../core/work/footprint.js";
import { approvalReason } from "../../core/team/policy.js";
import * as q from "../../core/work/queries.js";
import type { Store } from "../../core/store.js";
import { byKey, fail, stripComments } from "../../core/text.js";
import { evidence, implementers } from "../work/execution.js";
import { budgetProblems } from "../work/workflow.js";
import { openQuestions } from "./questions.js";
import { staffing } from "./team.js";
import { reviewProblems } from "../work/review.js";
import { mergeOrder } from "../work/release.js";
import { fastLane } from "../../core/work/gates.js";
import { paused, staleClaims } from "./liveness.js";

type Rule = (s: View) => string[];

class View {
  readonly plans: Map<string, Doc>;
  readonly items: Map<string, Doc>;
  readonly goals: Map<string, Doc>;
  readonly focus: string;
  readonly shared: string[]; // hub.shared
  readonly events;
  constructor(readonly store: Store) {
    this.plans = store.plans(true);
    this.items = store.items();
    this.goals = store.goals();
    this.focus = store.focus();
    this.shared = sharedGlobs(store);
    this.events = store.ledger.events();
  }
  status(st: string): Doc[] {
    return [...this.plans.values()].filter((p) => p.get("status") === st)
      .sort(byKey((p) => [!q.onFocus(p, this.items, this.focus), p.id]));
  }
  get assigned() {
    return this.store.ledger.assignments(this.events);
  }
  gate(step: string): string | undefined {
    return this.store.policy.policy.role_gates[step];
  }
  ranked(st: string): Doc[] {
    return q.ranked(this.items, this.goals, this.focus).filter((i) => q.itemStatus(i, this.plans) === st);
  }
}

const RULES: Record<string, Rule[]> = {
  executive: [
    (v) => openQuestions(v.events).filter((x) => x.escalation).map((x) => `answer ${x.id} (${x.by}${x.ref ? ` about ${x.ref}` : ""}): ${x.text}`),
    (v) => v.status("in-review").filter((p) => approvalReason(v.store.policy.policy, "plan.done")
      && evidence(v.store, p).every((e) => e.verify?.ok && e.independent))
      .map((p) => `approve ${p.id}: ${p.get("title")} — evidence complete → move ${p.id} done --approved-by <you>`),
    (v) => (["exploring", "researching", "proposed"].includes(v.store.idea()?.get("status") ?? "") ? ["decide the idea (go / pivot / kill)"] : []),
  ],
  director: [
    (v) => openQuestions(v.events).filter((x) => x.escalation).map((x) => `waiting on the executive: ${x.id} — ${x.text}`),
    (v) => budgetProblems(v.store).map((b) => `over budget: ${b}`),
    (v) => (paused(v.events) ? ["the team is paused: no staffing or starts until the executive or you `resume`"] : []),
    (v) => staleClaims(v.store, v.events).map((s) => `stale: ${s.ref} held by ${s.actor} with no activity for ${s.hours}h → reassign ${s.ref}`),
    (v) => v.status("blocked").map((p) => `unblock ${p.id}: ${p.get("title")}`),
    (v) => {
      if (paused(v.events)) return [];
      const n = staffing(v.store).start.length;
      return n ? [`staff ${n} ready plan${n > 1 ? "s" : ""}: \`staff\` → the PM assigns, developers start`] : [];
    },
    (v) => [...v.plans.values()].filter((p) => p.get("status") === "in-progress").flatMap((p) =>
      overlapping(p, v.plans, v.shared).map((o) => `${p.id} and ${o.id} overlap on ${o.globs.join(", ")} — sequence them, narrow touches or list the file in hub.shared`)),
    (v) => {
      const g = v.goals.get(v.focus);
      if (!v.focus) return v.goals.size ? ["set the focus goal: focus G-###"] : [];
      const open = q.goalPlans(v.focus, v.plans, v.items).filter((p) => !["done", "dropped"].includes(p.get("status") ?? ""));
      return g && !open.length && !q.goalItems(v.focus, v.items).some((i) => q.itemStatus(i, v.plans) !== "done")
        ? [`${v.focus} has nothing open: confirm its acceptance criteria, move it done, and focus the next goal`] : [];
    },
  ],
  pm: [
    (v) => v.ranked("new").filter((i) => i.id.startsWith("BUG-")).slice(0, 3).map((i) => `triage bug ${i.id}: ${i.get("title")}`),
    (v) => v.ranked("new").filter((i) => !i.id.startsWith("BUG-")).slice(0, 3).map((i) => `triage ${i.id}: ${i.get("title")}`),
    (v) => [...v.goals.values()].filter((g) => ["proposed", "active"].includes(g.get("status") ?? "")
      && !q.goalItems(g.id, v.items).some((i) => q.itemStatus(i, v.plans) !== "done"))
      .map((g) => `break ${g.id} down: it has no open items`),
    (v) => (v.gate("plan.assigned") === "pm" ? v.status("ready").filter((p) => !v.assigned.has(p.id)) : [])
      .map((p) => `open ${p.id}: ${p.get("title")} → assign ${p.id} --to developer (\`staff\` shows what can run now)`),
    (v) => (v.gate("plan.done") === "pm" ? v.status("in-review") : []).filter((p) => complete(v, p) && !reviewProblems(v.store, p).length)
      .map((p) => `complete ${p.id}: ${p.get("title")} — QA's evidence and the review are in → move ${p.id} done`),
  ],
  architect: [
    (v) => (v.gate("plan.reviewed") === "architect" ? v.status("in-review") : [])
      .filter((p) => reviewProblems(v.store, p).length && !implementers(v.events, p.id).has(v.store.ledger.who.run))
      .map((p) => `review ${p.id}: ${p.get("title")} — its diff against the spec → review ${p.id} --approve | --changes "…"`),
    (v) => v.status("draft").map((p) => `refine ${p.id}: ${p.get("title")} to the Definition of Ready`),
    (v) => v.ranked("triaged").slice(0, 2).map((i) => `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})`),
    (v) => v.status("ready").flatMap((p) => overlapping(p, v.plans, v.shared).map((o) => `${p.id} overlaps ${o.id} (${o.globs.join(", ")}): narrow touches or list the file in hub.shared`)),
  ],
  developer: [
    (v) => [...v.plans.values()].filter((p) => ["in-progress", "blocked"].includes(p.get("status") ?? "")
      && v.store.ledger.claims(v.events).get(p.id)?.run === v.store.ledger.who.run).map((p) => `continue ${p.id}: ${p.get("title")} → resume ${p.id}`),
    (v) => v.status("ready").filter((p) => (v.assigned.has(p.id) ? v.assigned.get(p.id)!.to === v.store.ledger.who.role : !v.gate("plan.assigned"))
      && !q.unmetDeps(p, v.plans).length && !v.store.ledger.claims(v.events).has(p.id)
      && !openQuestions(v.events, p.id).some((x) => x.blocking)).slice(0, 1).map((p) => `start ${p.id}: ${p.get("title")} → start ${p.id}`),
  ],
  qa: [
    (v) => v.status("in-review").filter((p) => !implementers(v.events, p.id).has(v.store.ledger.who.run)).map((p) => {
      const missing = evidence(v.store, p).flatMap((e, i) => (e.verify?.ok && e.independent ? [] : [`AC${i + 1}`]));
      const closer = v.gate("plan.done");
      return missing.length ? `verify ${p.id}: ${missing.join(", ")} → checkpoint ${p.id} --run "<check>" --ac …`
        : closer && closer !== "qa" ? `${p.id}: evidence complete → report to the ${closer}, who completes it`
          : `${p.id}: evidence complete → move ${p.id} done`;
    }),
    (v) => v.ranked("new").filter((i) => i.id.startsWith("BUG-")).slice(0, 2).map((i) => `reproduce ${i.id}: ${i.get("title")}`),
  ],
  release: [
    (v) => mergeOrder(v.store).merge.slice(0, 1)
      .map((p) => `ship ${p.id}: merge ${p.branch} (first in \`merge-order\`), follow its Rollout & rollback, then delete the branch`),
    (v) => v.status("in-review").filter((p) => !fastLane(v.store, p) && p.hasContent("Rollout & rollback")
      && !/^\s*n\/a\b/i.test(stripComments(p.section("Rollout & rollback"))))
      .map((p) => `prepare the rollout of ${p.id}: ${p.get("title")} (see its Rollout & rollback)`),
  ],
};

const complete = (v: View, p: Doc) => evidence(v.store, p).every((e) => e.verify?.ok && e.independent);

export function roleLines(store: Store, role: string): string[] {
  const roles = store.policy.roles;
  if (!roles.includes(role)) fail(`Unknown role '${role}'. Roles: ${roles.join(", ")}.`);
  const v = new View(store);
  const asked = openQuestions(v.events).filter((x) => x.to === role && !(role === "executive" && x.escalation))
    .map((x) => `QUESTION     ${x.id} from ${x.by}${x.ref ? ` about ${x.ref}` : ""}: ${x.text} → answer ${x.id} "…"`);
  const work = (RULES[role] ?? []).flatMap((r) => r(v)); // a project-defined role has questions, no built-in queue
  return [...asked, ...work.map((w, i) => `${i ? "THEN" : "NEXT"}         ${w}`).slice(0, 8),
    ...(asked.length || work.length ? [] : [`NEXT         nothing for the ${role} role right now`])];
}
