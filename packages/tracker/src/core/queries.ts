/** Derived relationships between documents. Pure functions over loaded documents. */
import type { Doc } from "./doc.js";
import { ITEM_CLOSED, LEVEL, PLAN_TO_ITEM, PRIORITIES } from "./model.js";
import type { Docs } from "./store.js";
import { byKey, idList, type SortKey } from "./text.js";

const up = (s: string | null) => (s ?? "").toUpperCase();

/** Stored status until a plan links the item; then the status follows the plan. */
export function itemStatus(item: Doc, plans: Docs): string {
  const st = item.get("status") || "new";
  if (ITEM_CLOSED.has(st)) return st;
  const p = plans.get(up(item.get("plan")));
  return p ? PLAN_TO_ITEM[p.get("status") ?? ""] ?? st : st;
}

export function itemMilestone(item: Doc, epics: Docs): string {
  if (item.get("milestone")) return up(item.get("milestone"));
  const e = epics.get(up(item.get("epic")));
  return e ? up(e.get("milestone")) : "";
}

export function planItems(plan: Doc, items: Docs): Doc[] {
  const linked = new Set([...items].filter(([, it]) => up(it.get("plan")) === plan.id).map(([i]) => i));
  for (const i of idList(plan.get("items"))) linked.add(i);
  return [...linked].sort().filter((i) => items.has(i)).map((i) => items.get(i)!);
}

export function planMilestone(plan: Doc, epics: Docs, items: Docs): string {
  const e = epics.get(up(plan.get("epic")));
  if (e?.get("milestone")) return up(e.get("milestone"));
  for (const it of planItems(plan, items)) {
    const m = itemMilestone(it, epics);
    if (m) return m;
  }
  return "";
}

/** The open sprint a plan is committed to (else the latest closed one). */
export function sprintOf(planId: string, sprints: Docs): Doc | null {
  const hits = [...sprints.values()].filter((s) => idList(s.get("plans")).includes(planId));
  const open = hits.filter((s) => s.get("status") !== "closed");
  const pool = open.length ? open : hits.sort(byKey((s) => [s.id]));
  return pool.length ? pool[pool.length - 1] : null;
}

export function activeSprint(sprints: Docs): Doc | null {
  return [...sprints.values()].find((s) => s.get("status") === "active") ?? null;
}

/** Average done points of the last three closed sprints. */
export function velocity(sprints: Docs): number | null {
  const closed = [...sprints.values()].filter((s) => s.get("status") === "closed").sort(byKey((s) => [s.id]));
  const vs = closed.slice(-3).map((s) => s.get("velocity") ?? "").filter((v) => /^\d+$/.test(v)).map(Number);
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
}

export function committedPoints(sprint: Doc, plans: Docs): number {
  return idList(sprint.get("plans")).reduce((n, p) => n + (plans.get(p)?.points() ?? 0), 0);
}

export function milestoneOrder(milestones: Docs): Map<string, number> {
  const ordered = [...milestones.values()].sort(byKey((m) => [m.get("target") || "9999", m.id]));
  return new Map(ordered.map((m, i) => [m.id, i]));
}

export function epicOrder(epics: Docs): Map<string, number> {
  return new Map([...epics.keys()].sort().map((e, i) => [e, i]));
}

/** Backlog ranking: P0 first, then milestone → priority → epic → ID. */
export function itemRank(it: Doc, epics: Docs, morder: Map<string, number>): SortKey {
  const eorder = epicOrder(epics);
  const prio = PRIORITIES.includes(it.get("priority") ?? "") ? it.get("priority")! : "P9";
  return [prio !== "P0", morder.get(itemMilestone(it, epics)) ?? morder.size, prio,
    eorder.get(up(it.get("epic"))) ?? eorder.size, it.id];
}

export function unmetDeps(doc: Doc, plans: Docs): string[] {
  return doc.dependsOn().filter((d) => plans.get(d)?.get("status") !== "done");
}

export function epicItems(epicId: string, items: Docs): Doc[] {
  return [...items.values()].filter((i) => up(i.get("epic")) === epicId && !ITEM_CLOSED.has(i.get("status") ?? ""));
}

export function epicPlans(epicId: string, plans: Docs): Doc[] {
  return [...plans.values()].filter((p) => up(p.get("epic")) === epicId);
}

export function riskScore(risk: Record<string, string>): number {
  const level = (key: string) => LEVEL[(risk[key] ?? "").trim().toLowerCase()] ?? 0;
  return level("probability") * level("impact");
}
