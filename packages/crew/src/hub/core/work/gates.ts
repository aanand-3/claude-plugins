/** Quality gates: what an item needs to be triaged, a plan to be ready and the idea to be decided. */
import type { Doc } from "./doc.js";
import { isUiPlan } from "./footprint.js";
import { K_ID_RE } from "../memory/knowledge.js";
import { DECIDED_SECTIONS, PRIORITIES, READY_SECTIONS, SEVERITY_PRIORITY, TRIAGE_SECTIONS } from "./model.js";
import { planItems } from "./queries.js";
import type { Store } from "../store.js";
import { idList, stripComments } from "../text.js";

export function triageProblems(item: Doc): string[] {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n) => `empty section: ${n}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0–P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1–S4)");
  return problems;
}

/** The fast lane: a small chore or bug fix the PM may spec and make ready without the Architect — every item it delivers is
 * of a `fast_lane.types` type and it has at most `fast_lane.max_tasks` tasks. QA's evidence, the review and the PM's
 * completion still apply; Release merges it without a rollout step. */
export function fastLane(store: Store, plan: Doc): boolean {
  const { types, max_tasks } = store.policy.policy.fast_lane;
  const items = planItems(plan, store.items());
  return types.length > 0 && items.length > 0 && items.every((i) => types.includes(i.id.split("-")[0]))
    && (max_tasks === null || plan.tasks().length <= max_tasks);
}

/** Definition of Ready (a UI plan also needs its `## Design`). */
export function readinessProblems(store: Store, plan: Doc): string[] {
  return [
    ...plan.missing(READY_SECTIONS).map((n) => `empty section: ${n}`),
    ...(plan.touches().length ? [] : ["no touches: (the paths this plan will change)"]),
    ...(isUiPlan(store, plan) && plan.missing(["Design"]).length ? ["empty section: Design (a UI plan: touches overlap design.ui_paths)"] : []),
    ...taskProblems(store, plan),
    ...itemProblems(store, plan),
  ];
}

/** Definition of Done, memory part: the Outcome names what was learned (K-… entries from `learn`) or says `none`. */
export function learningsProblems(plan: Doc, known: Set<string>): string[] {
  const m = /^\s*[-*]?\s*\**learnings?\**\s*:\**\s*(.*)$/im.exec(stripComments(plan.section("Outcome")));
  if (!m) return ["Outcome has no `Learnings:` line — list the K-… entries captured with `learn`, or write `Learnings: none`"];
  const ids = m[1].match(K_ID_RE) ?? [];
  if (!ids.length && !/^none\b/i.test(m[1].trim())) return ["`Learnings:` must list K-… entries or say none"];
  return ids.filter((i) => !known.has(i)).map((i) => `Learnings: ${i} does not exist`);
}

/** What the executive must have agreed before the idea is decided. */
export function decisionProblems(idea: Doc): string[] {
  const problems = idea.missing(DECIDED_SECTIONS).map((n) => `empty section: ${n}`);
  if (idea.hasContent("Success criteria") && !idea.checklist("Success criteria").length) {
    problems.push("Success criteria must be a checklist (`- [ ] …`) so each one can be verified");
  }
  return problems;
}

function taskProblems(store: Store, plan: Doc): string[] {
  const tasks = plan.tasks();
  const max = store.settings().max_tasks;
  const problems = tasks.length ? [] : ["no tasks"];
  const noVerify = tasks.filter(([, t]) => !t.toLowerCase().includes("verify")).map(([, t]) => t.split("→")[0].trim());
  if (noVerify.length) problems.push(`tasks without '→ verify:': ${noVerify.join("; ")}`);
  if (tasks.length > max) problems.push(`${tasks.length} tasks (> max_tasks ${max}) — split the plan`);
  return problems;
}

function itemProblems(store: Store, plan: Doc): string[] {
  const items = store.items();
  const linked = idList(plan.get("items"));
  const problems: string[] = [];
  for (const i of linked) {
    if (!items.has(i)) problems.push(`unknown item ${i}`);
    else if (items.get(i)!.get("status") === "new") problems.push(`item ${i} is not triaged`);
  }
  if (linked.some((i) => i.startsWith("BUG-"))) {
    const text = (plan.section("Acceptance criteria") + plan.section("Tasks") + plan.section("Test plan")).toLowerCase();
    if (!text.includes("regression")) {
      problems.push("fixes a bug but names no regression test (acceptance criteria, tasks or test plan)");
    }
  }
  return problems;
}
