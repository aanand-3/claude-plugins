/** `context`: what an agent needs right now, assembled from the hub (project state, ledger, memory) under a hard budget.
 * Sections come in priority order; what doesn't fit becomes a pointer to the command that shows it in full. */
import type { Doc } from "../core/doc.js";
import { drift, overlapping } from "../core/footprint.js";
import * as git from "../core/git.js";
import { type Entry, recall } from "../core/knowledge.js";
import * as q from "../core/queries.js";
import type { Store } from "../core/store.js";
import { fail, firstParagraph, stripComments } from "../core/text.js";
import { nextLines } from "./advisor.js";
import { criteria, evidence, recovery } from "./execution.js";
import { openQuestions } from "./questions.js";
import { roleLines } from "./roles.js";

export const DEFAULT_BUDGET = 6000; // characters, about 1,500 tokens
interface Section { title: string; lines: string[]; more: string }

const para = (text: string, n = 3) => stripComments(text).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, n);
/** Knowledge types each role needs first. */
const TYPES: Record<string, string[]> = {
  developer: ["gotcha", "convention", "decision", "learning", "risk"], qa: ["gotcha", "risk", "learning", "decision", "convention"],
  architect: ["decision", "convention", "risk", "gotcha", "learning"], release: ["risk", "decision", "gotcha", "convention", "learning"],
};

function planSections(store: Store, plan: Doc, role: string): Section[] {
  const items = store.items(), plans = store.plans(true), goals = store.goals();
  const goal = goals.get(q.planGoal(plan, items));
  const idea = store.idea();
  const why: Section = { title: "Goal", more: plan.path ? store.rel(plan.path) : plan.id, lines: [
    ...(idea ? [`Idea: ${idea.get("title")} — ${firstParagraph(idea.section("Outcome"))}`] : []),
    ...(goal ? [`${goal.id}${goal.id === store.focus() ? " (focus)" : ""}: ${goal.get("title")} — ${firstParagraph(goal.section("Outcome"))}`] : []),
    ...para(plan.section("Context"), 4)] };
  const ev = evidence(store, plan);
  const ac: Section = { title: "Acceptance criteria", more: `crew.mjs resume ${plan.id}`, lines: criteria(plan).map((c, i) =>
    `AC${i + 1} ${!ev[i]?.verify ? "·" : !ev[i].verify!.ok ? "✗" : ev[i].independent ? "✓" : "✓ self"} ${c}`) };
  const tasks: Section = { title: "Remaining tasks", more: plan.path ? store.rel(plan.path) : plan.id,
    lines: plan.tasks().filter(([d]) => !d).map(([, t]) => t) };
  const waits = q.unmetDeps(plan, plans), asks = openQuestions(store.ledger.events(), plan.id);
  const over = overlapping(plan, plans), outside = drift(plan, store.baseBranch()) ?? [];
  const questions: Section = { title: "Open questions", more: "crew.mjs questions", lines: [
    ...asks.map((x) => `${x.blocking ? "blocking: " : ""}${x.id} ${x.by} → ${x.to}: ${x.text}`),
    ...openQuestions(store.ledger.events()).filter((x) => x.to === role && x.ref !== plan.id)
      .map((x) => `for you: ${x.id} from ${x.by}${x.ref ? ` about ${x.ref}` : ""}: ${x.text}`)] };
  const blockers: Section = { title: "Blockers & coordination", more: "crew.mjs questions", lines: [
    ...waits.map((d) => `waits for ${d} (${plans.get(d)?.get("status")})`),
    ...over.map((o) => `overlaps ${o.id} (${plans.get(o.id)?.get("status")}) on ${o.globs.join(", ")}`),
    ...(outside.length ? [`changes outside touches: ${outside.slice(0, 6).join(", ")}${outside.length > 6 ? " …" : ""}`] : [])] };
  const order = TYPES[role] ?? TYPES.developer;
  const known = recall(store.knowledge(), { globs: plan.touches() }).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const memory: Section = { title: "Knowledge in scope", more: `crew.mjs recall --plan ${plan.id}`, lines: known.map(line) };
  const recover: Section = { title: "Where the work stands", more: `crew.mjs resume ${plan.id}`, lines: recovery(store, plan) };
  const handoff: Section = { title: "Handoff & log", more: `crew.mjs ledger --ref ${plan.id}`, lines: [
    ...para(plan.section("Handoff"), 6), ...para(plan.section("Progress log"), 99).slice(-3)] };
  const sect = (title: string, name: string): Section => ({ title, more: plan.path ? store.rel(plan.path) : plan.id, lines: para(plan.section(name), 8) });
  const bugs: Section = { title: "Open bugs in this goal", more: "crew.mjs status", lines: [...items.values()]
    .filter((i) => i.id.startsWith("BUG-") && goal && i.get("goal")?.toUpperCase() === goal.id && !["done", "wontfix", "duplicate"].includes(q.itemStatus(i, plans)))
    .map((i) => `${i.id} ${i.get("severity") ?? ""} ${i.get("title")} [${q.itemStatus(i, plans)}]`) };
  switch (role) {
    case "qa": return [questions, why, ac, sect("Test plan", "Test plan"), recover, bugs, memory, blockers];
    case "architect": return [questions, why, sect("Approach", "Approach"), sect("Risks & open questions", "Risks & open questions"), blockers, memory, ac];
    case "release": return [questions, why, sect("Rollout & rollback", "Rollout & rollback"), blockers, ac, memory];
    default: return [recover, questions, why, ac, tasks, blockers, memory, handoff];
  }
}

const line = (e: Entry) => `${e.id} [${e.type}${e.origin === "playbook" ? ", playbook" : ""}] ${e.title}`;

function projectSections(store: Store, role: string): Section[] {
  const idea = store.idea(), focus = store.goals().get(store.focus());
  const crit = idea?.checklist("Success criteria") ?? [];
  const head: Section = { title: "Idea & focus", more: "crew.mjs status", lines: [
    idea ? `Idea: ${idea.get("title")} [${idea.get("status")}]${crit.length ? ` — success criteria ${crit.filter(([d]) => d).length}/${crit.length}` : ""}` : "No idea written yet.",
    focus ? `Focus ${focus.id}: ${focus.get("title")} — ${firstParagraph(focus.section("Outcome"))}` : "No focus goal."] };
  const next: Section = { title: role === "any" ? "Next" : `Next for ${role}`, more: `crew.mjs next${role === "any" ? "" : ` --role ${role}`}`,
    lines: role === "any" ? nextLines(store) : roleLines(store, role) };
  const events = store.ledger.events();
  const team: Section = { title: "Team", more: "crew.mjs ledger", lines: [
    ...[...store.ledger.claims(events).values()].map((c) => `${c.ref} held by ${c.actor} (${c.run})`),
    ...openQuestions(events).filter((x) => x.escalation).map((x) => `escalation ${x.id} waits for the ${x.to}: ${x.text}`)] };
  const spend = store.ledger.spend(events);
  if (spend.cost) team.lines.push(`spend so far $${spend.cost.toFixed(2)}`);
  const memory: Section = { title: "Recent knowledge", more: "crew.mjs recall", lines: store.knowledge(false).filter((e) => !e.supersededBy)
    .sort((a, b) => (b.doc.get("created") ?? "").localeCompare(a.doc.get("created") ?? "")).slice(0, 5).map(line) };
  return [head, next, team, memory];
}

/** Assemble sections within the budget: whole sections while they fit, then as many lines as fit, then pointers. */
export function assemble(header: string, sections: Section[], budget: number): string[] {
  const out = [header];
  let used = header.length + 1;
  const push = (l: string) => {
    if (used + l.length + 1 > budget) return false;
    out.push(l);
    used += l.length + 1;
    return true;
  };
  for (const [n, s] of sections.filter((x) => x.lines.length).entries()) {
    const pointer = `(more: ${s.more})`;
    if (!push(`## ${s.title}`)) {
      const rest = `… also: ${sections.filter((x) => x.lines.length).slice(n).map((x) => `${x.title} (${x.more})`).join(" · ")}`;
      const room = budget - used - 1;
      if (room >= 40) push(rest.length <= room ? rest : `${rest.slice(0, room - 1)}…`);
      break;
    }
    for (const [i, l] of s.lines.entries()) {
      const room = budget - used - 1 - (i < s.lines.length - 1 ? pointer.length + 1 : 0);
      if (l.length + 1 > room) {
        push(pointer);
        break;
      }
      push(`- ${l}`.slice(0, room));
    }
  }
  return out;
}

export function context(store: Store, o: { id?: string; role?: string; budget?: number; json?: boolean } = {}): void {
  store.require();
  const role = o.role ?? store.ledger.who.role ?? "any";
  const roles = store.policy.roles;
  if (role !== "any" && !roles.includes(role)) fail(`Unknown role '${role}'. Roles: ${roles.join(", ")}.`);
  const budget = o.budget ?? DEFAULT_BUDGET;
  if (budget < 200) fail("--budget must be at least 200 characters.");
  const pid = o.id?.toUpperCase() ?? /^plan\/(P-\d+)/.exec(git.currentBranch() ?? "")?.[1];
  const plan = pid ? store.plans(true).get(pid) ?? fail(`No plan ${pid}.`) : null;
  const header = `crew context${role === "any" ? "" : ` — ${role}`}${plan ? ` — ${plan.id}: ${plan.get("title")} [${plan.get("status")}]` : ""}`;
  const lines = assemble(header, plan ? planSections(store, plan, role) : projectSections(store, role), budget);
  if (o.json) store.say(JSON.stringify({ plan: plan?.id ?? null, role, budget, text: lines.join("\n") }));
  else for (const l of lines) store.say(l);
}
