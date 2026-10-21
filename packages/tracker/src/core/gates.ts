/** Quality gates: what an item needs to be triaged and a plan needs to be ready. */
import type { Doc } from "./doc.js";
import { MAX_TASKS, PRIORITIES, READY_SECTIONS, SEVERITY_PRIORITY, TRIAGE_SECTIONS } from "./model.js";
import type { Store } from "./store.js";
import { idList } from "./text.js";

const list = (xs: number[]) => `[${xs.join(", ")}]`;

export function triageProblems(store: Store, item: Doc): string[] {
  const prefix = item.id.split("-")[0];
  const problems = item.missing(TRIAGE_SECTIONS[prefix]).map((n) => `empty section: ${n}`);
  if (!PRIORITIES.includes(item.get("priority") ?? "")) problems.push("no priority (P0–P3)");
  if (prefix === "BUG" && !Object.hasOwn(SEVERITY_PRIORITY, item.get("severity") ?? "")) problems.push("no severity (S1–S4)");
  const scale = store.settings().points_scale;
  const pts = item.points();
  if (prefix !== "BUG" && pts === null) problems.push("no estimate (--points)");
  if (pts !== null && !scale.includes(pts)) problems.push(`points ${pts} not on the scale ${list(scale)}`);
  return problems;
}

/** Definition of Ready. */
export function readinessProblems(store: Store, plan: Doc): string[] {
  return [
    ...plan.missing(READY_SECTIONS).map((n) => `empty section: ${n}`),
    ...taskProblems(plan),
    ...estimateProblems(store, plan),
    ...itemProblems(store, plan),
  ];
}

function taskProblems(plan: Doc): string[] {
  const tasks = plan.tasks();
  const problems = tasks.length ? [] : ["no tasks"];
  const noVerify = tasks.filter(([, t]) => !t.toLowerCase().includes("verify")).map(([, t]) => t.split("→")[0].trim());
  if (noVerify.length) problems.push(`tasks without '→ verify:': ${noVerify.join("; ")}`);
  if (tasks.length > MAX_TASKS) problems.push(`${tasks.length} tasks (> ${MAX_TASKS}) — split the plan`);
  return problems;
}

function estimateProblems(store: Store, plan: Doc): string[] {
  const s = store.settings();
  const pts = plan.points();
  if (pts === null) return ["no estimate (points:)"];
  if (!s.points_scale.includes(pts)) return [`points ${pts} not on the scale ${list(s.points_scale)}`];
  if (pts > s.max_plan_points) return [`${pts} points > max_plan_points (${s.max_plan_points}) — split the plan`];
  return [];
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
