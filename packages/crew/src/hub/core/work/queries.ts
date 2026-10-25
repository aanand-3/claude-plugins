/** Derived relationships between documents. Pure functions over loaded documents. */
import type { Doc } from "./doc.js";
import { ITEM_CLOSED, OFF_FOCUS_OK, PLAN_TO_ITEM, PRIORITIES } from "./model.js";
import type { Docs } from "../store.js";
import { byKey, idList, type SortKey } from "../text.js";

const up = (s: string | null) => (s ?? "").toUpperCase();

/** Stored status until a plan links the item; then the status follows the plan. */
export function itemStatus(item: Doc, plans: Docs): string {
  const st = item.get("status") || "new";
  if (ITEM_CLOSED.has(st)) return st;
  const p = plans.get(up(item.get("plan")));
  return p ? PLAN_TO_ITEM[p.get("status") ?? ""] ?? st : st;
}

export function planItems(plan: Doc, items: Docs): Doc[] {
  const linked = new Set([...items].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items.has(i)).map((i) => items.get(i)!);
}

/** The goal a plan serves: its own `goal:`, else the first goal among its items. */
export function planGoal(plan: Doc, items: Docs): string {
  return up(plan.get("goal")) || planItems(plan, items).map((i) => up(i.get("goal"))).find(Boolean) || "";
}

/** True when a plan serves the focus goal, or only delivers bugs and chores (allowed off focus). */
export function onFocus(plan: Doc, items: Docs, focus: string): boolean {
  if (!focus || planGoal(plan, items) === focus) return true;
  const linked = planItems(plan, items);
  return linked.length > 0 && linked.every((i) => OFF_FOCUS_OK.has(i.id.split("-")[0]));
}

export function goalOrder(goals: Docs): Map<string, number> {
  return new Map([...goals.keys()].sort().map((e, i) => [e, i]));
}

/** The goal queue: the approved (`active`) goals by priority (P0 first, none last), then ID; the focus first when active. */
export function goalQueue(goals: Docs, focus: string): string[] {
  const rank = (g: Doc): SortKey => {
    const p = PRIORITIES.indexOf(g.get("priority") ?? "");
    return [g.id !== focus, p < 0 ? PRIORITIES.length : p, g.id];
  };
  return [...goals.values()].filter((g) => g.get("status") === "active").sort(byKey(rank)).map((g) => g.id);
}

/** Backlog ranking: P0 first, then the focus goal, then priority → goal → ID. */
export function itemRank(it: Doc, goals: Docs, focus: string): SortKey {
  const eorder = goalOrder(goals);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority")! : "P9";
  return [prio !== "P0", !focus || up(it.get("goal")) !== focus, prio, eorder.get(up(it.get("goal"))) ?? eorder.size, it.id];
}

export function ranked(items: Docs, goals: Docs, focus: string): Doc[] {
  return [...items.values()].sort(byKey((i) => itemRank(i, goals, focus)));
}

export function unmetDeps(doc: Doc, plans: Docs): string[] {
  return doc.dependsOn().filter((d) => plans.get(d)?.get("status") !== "done");
}

export function goalItems(goalId: string, items: Docs): Doc[] {
  return [...items.values()].filter((i) => up(i.get("goal")) === goalId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}

export function goalPlans(goalId: string, plans: Docs, items: Docs): Doc[] {
  return [...plans.values()].filter((p) => planGoal(p, items) === goalId);
}
