/** `next --role R`: each role's own queue. Questions addressed to the role come first, then its work, most urgent first. */
import type { Doc } from "../core/doc.js";
import * as git from "../core/git.js";
import { overlapping } from "../core/footprint.js";
import { ROLES } from "../core/model.js";
import { approvalReason } from "../core/policy.js";
import * as q from "../core/queries.js";
import type { Store } from "../core/store.js";
import { byKey, fail, stripComments } from "../core/text.js";
import { evidence, implementers } from "./execution.js";
import { budgetProblems } from "./workflow.js";
import { openQuestions } from "./questions.js";

type Rule = (s: View) => string[];

class View {
  readonly plans: Map<string, Doc>;
  readonly items: Map<string, Doc>;
  readonly goals: Map<string, Doc>;
  readonly focus: string;
  readonly events;
  constructor(readonly store: Store) {
    this.plans = store.plans(true);
    this.items = store.items();
    this.goals = store.goals();
    this.focus = store.focus();
    this.events = store.ledger.events();
  }
  status(st: string): Doc[] {
    return [...this.plans.values()].filter((p) => p.get("status") === st)
      .sort(byKey((p) => [!q.onFocus(p, this.items, this.focus), p.id]));
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
    (v) => v.status("blocked").map((p) => `unblock ${p.id}: ${p.get("title")}`),
    (v) => [...v.plans.values()].filter((p) => p.get("status") === "in-progress").flatMap((p) =>
      overlapping(p, v.plans).map((o) => `${p.id} and ${o.id} overlap on ${o.globs.join(", ")} — sequence them or split the work`)),
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
  ],
  architect: [
    (v) => v.status("draft").map((p) => `refine ${p.id}: ${p.get("title")} to the Definition of Ready`),
    (v) => v.ranked("triaged").slice(0, 2).map((i) => `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})`),
    (v) => v.status("ready").flatMap((p) => overlapping(p, v.plans).map((o) => `${p.id} overlaps ${o.id} (${o.globs.join(", ")}): add depends_on or narrow touches`)),
  ],
  developer: [
    (v) => [...v.plans.values()].filter((p) => ["in-progress", "blocked"].includes(p.get("status") ?? "")
      && v.store.ledger.claims(v.events).get(p.id)?.run === v.store.ledger.who.run).map((p) => `continue ${p.id}: ${p.get("title")} → resume ${p.id}`),
    (v) => v.status("ready").filter((p) => !q.unmetDeps(p, v.plans).length && !v.store.ledger.claims(v.events).has(p.id)
      && !openQuestions(v.events, p.id).some((x) => x.blocking)).slice(0, 1).map((p) => `start ${p.id}: ${p.get("title")} → start ${p.id}`),
  ],
  qa: [
    (v) => v.status("in-review").filter((p) => !implementers(v.events, p.id).has(v.store.ledger.who.run)).map((p) => {
      const missing = evidence(v.store, p).flatMap((e, i) => (e.verify?.ok && e.independent ? [] : [`AC${i + 1}`]));
      return missing.length ? `verify ${p.id}: ${missing.join(", ")} → checkpoint ${p.id} --run "<check>" --ac …`
        : `${p.id}: evidence complete → move ${p.id} done`;
    }),
    (v) => v.ranked("new").filter((i) => i.id.startsWith("BUG-")).slice(0, 2).map((i) => `reproduce ${i.id}: ${i.get("title")}`),
  ],
  release: [
    (v) => v.status("done").filter((p) => git.planBranches().includes(p.get("branch") ?? ""))
      .map((p) => `ship ${p.id}: merge ${p.get("branch")}, follow its Rollout & rollback, then delete the branch`),
    (v) => v.status("in-review").filter((p) => p.hasContent("Rollout & rollback")
      && !/^\s*n\/a\b/i.test(stripComments(p.section("Rollout & rollback"))))
      .map((p) => `prepare the rollout of ${p.id}: ${p.get("title")} (see its Rollout & rollback)`),
  ],
};

export function roleLines(store: Store, role: string): string[] {
  if (!(ROLES as readonly string[]).includes(role)) fail(`Unknown role '${role}'. Roles: ${ROLES.join(", ")}.`);
  const v = new View(store);
  const asked = openQuestions(v.events).filter((x) => x.to === role && !(role === "executive" && x.escalation))
    .map((x) => `QUESTION     ${x.id} from ${x.by}${x.ref ? ` about ${x.ref}` : ""}: ${x.text} → answer ${x.id} "…"`);
  const work = RULES[role].flatMap((r) => r(v));
  return [...asked, ...work.map((w, i) => `${i ? "THEN" : "NEXT"}         ${w}`).slice(0, 8),
    ...(asked.length || work.length ? [] : [`NEXT         nothing for the ${role} role right now`])];
}
