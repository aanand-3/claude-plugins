/** Milestones: scope in points, delivery forecast from velocity, release notes. */
import type { Doc } from "../core/doc.js";
import { ITEM_CLOSED, PLAN_TO_ITEM, TYPE_LABEL } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Docs, Store } from "../core/store.js";
import { addDays, asDate, byKey, fixed, today } from "../core/text.js";

/** One piece of milestone scope: an item, or a plan that has no items. */
export interface Unit { id: string; title: string; kind: string; points: number | null; status: string }

export class Scope {
  constructor(readonly units: Unit[]) {}
  get total(): number { return this.units.reduce((n, u) => n + (u.points ?? 0), 0); }
  get done(): number { return this.units.filter((u) => u.status === "done").reduce((n, u) => n + (u.points ?? 0), 0); }
  get unestimated(): string[] { return this.units.filter((u) => u.points === null && u.status !== "done").map((u) => u.id); }
}

export function scope(mid: string, goals: Docs, items: Docs, plans: Docs): Scope {
  const units: Unit[] = [...items.values()]
    .filter((it) => q.itemMilestone(it, goals) === mid && !ITEM_CLOSED.has(it.get("status") ?? ""))
    .map((it) => ({ id: it.id, title: it.get("title") ?? "", kind: it.id.split("-")[0], points: it.points(),
      status: q.itemStatus(it, plans) }));
  for (const p of plans.values()) {
    if (p.get("status") !== "dropped" && !q.planItems(p, items).length && q.planMilestone(p, goals, items) === mid) {
      units.push({ id: p.id, title: p.get("title") ?? "", kind: "PLAN", points: p.points(),
        status: PLAN_TO_ITEM[p.get("status") ?? ""] ?? "planned" });
    }
  }
  return new Scope(units);
}

export type Health = "released" | "dropped" | "no-scope" | "on-track" | "at-risk" | "late" | "no-target";
const HEALTH_LABEL: Record<Health, string> = {
  released: "✅ released", dropped: "dropped", "no-scope": "⚪ no scope", "on-track": "🟢 on track", "at-risk": "🟡 at risk",
  late: "🔴 late", "no-target": "no target",
};

/** projected is null when nothing is left to deliver (or there is no scope). */
export interface Forecast { projected: string | null; sprints: number; velocity: number; health: Health; unestimated: number }

/** The points of earlier milestones (queued) plus this one's remaining, ÷ velocity, counted from the first open
 *  sprint's start (else today), vs the target date. */
export function forecast(store: Store, m: Doc, sc: Scope, sprints: Docs, queued = 0): Forecast {
  const s = store.settings();
  const vel = q.velocity(sprints) || s.capacity_points;
  const base = { velocity: vel, sprints: 0, unestimated: sc.unestimated.length };
  const status = m.get("status");
  if (status === "released") return { ...base, projected: m.get("released"), health: "released", unestimated: 0 };
  if (status === "dropped") return { ...base, projected: null, health: "dropped", unestimated: 0 };
  if (!sc.total) return { ...base, projected: null, health: "no-scope" };
  const remaining = queued + sc.total - sc.done;
  if (remaining <= 0) return { ...base, projected: null, health: "on-track" };
  const n = vel ? Math.ceil(remaining / vel) : 0;
  const projected = addDays(firstSprintStart(sprints), n * s.sprint_length_days - 1);
  const target = asDate(m.get("target"));
  const health: Health = !target ? "no-target" : projected <= target ? "on-track"
    : projected <= addDays(target, s.sprint_length_days) ? "at-risk" : "late";
  return { ...base, projected, sprints: n, health };
}

function firstSprintStart(sprints: Docs): string {
  const starts = [...sprints.values()].filter((x) => x.get("status") !== "closed")
    .map((x) => asDate(x.get("start"))).filter((d): d is string => d !== null);
  return starts.length ? starts.sort()[0] : asDate(today())!;
}

function forecastText(m: Doc, f: Forecast): [string, string] {
  if (f.health === "released") return [`released ${m.get("released") ?? ""}`.trim(), HEALTH_LABEL.released];
  if (f.health === "dropped") return ["—", HEALTH_LABEL.dropped];
  const health = HEALTH_LABEL[f.health] + (f.unestimated ? ` (${f.unestimated} unestimated)` : "");
  if (f.health === "no-scope") return ["—", health];
  if (f.projected === null) return ["scope done", health];
  return [`${f.projected} (${f.sprints} sprint${f.sprints !== 1 ? "s" : ""} @ ${fixed(f.velocity)} pts)`, health];
}

export function milestoneRows(store: Store, goals: Docs, items: Docs, plans: Docs, sprints: Docs): string[] {
  const ms = store.milestones();
  if (!ms.size) return ["_No milestones._"];
  const order = q.milestoneOrder(ms);
  const rows = ["| Milestone | Target | Status | Progress | Forecast | Health |", "|---|---|---|---|---|---|"];
  let queued = 0; // milestones are delivered in target order: each one's forecast starts after the earlier ones
  for (const mid of [...ms.keys()].sort(byKey((k) => [order.get(k)!]))) {
    const m = ms.get(mid)!;
    const sc = scope(mid, goals, items, plans);
    const pct = sc.total ? `${Math.floor(100 * sc.done / sc.total)}%` : "–";
    const [fc, health] = forecastText(m, forecast(store, m, sc, sprints, queued));
    if (!["released", "dropped"].includes(m.get("status") ?? "")) queued += sc.total - sc.done;
    rows.push(`| ${mid}: ${m.get("title")} | ${m.get("target") || "—"} | ${m.get("status")} | `
      + `${sc.done}/${sc.total} pts (${pct}) | ${fc} | ${health} |`);
  }
  return rows;
}

export function releaseNotes(store: Store, mid: string, write: boolean): void {
  store.require();
  const m = store.find(mid);
  const goals = store.goals(), items = store.items();
  const plans = store.plans(true);
  const when = m.get("released") ? `Released ${m.get("released")}` : `Unreleased (target ${m.get("target") || "?"})`;
  const lines = [`# Release notes — ${m.id}: ${m.get("title")}`, "", `_${when}._`, ""];
  const doneItems = [...items.values()].filter((i) => q.itemMilestone(i, goals) === m.id && q.itemStatus(i, plans) === "done");
  for (const [prefix, label] of Object.entries(TYPE_LABEL)) {
    const sel = doneItems.filter((i) => i.id.startsWith(`${prefix}-`)).sort(byKey((i) => [i.id]));
    if (sel.length) lines.push(`## ${label}`, "", ...sel.map((i) => noteLine(i, plans)), "");
  }
  const other = [...plans.values()].filter((p) => p.get("status") === "done" && !q.planItems(p, items).length
    && q.planMilestone(p, goals, items) === m.id).sort(byKey((p) => [p.id]));
  if (other.length) {
    lines.push("## Other changes", "", ...other.map((p) => `- ${p.id}: ${p.get("title")}` + (p.get("pr") ? ` (${p.get("pr")})` : "")), "");
  }
  if (!doneItems.length && !other.length) lines.push("_Nothing done yet._");
  const out = `${lines.join("\n").trimEnd()}\n`;
  if (!write) {
    store.say(out);
    return;
  }
  const path = `${store.dir}/releases/${m.id}.md`;
  store.ws.write(path, out);
  store.say(`Wrote ${store.rel(path)}`);
}

function noteLine(item: Doc, plans: Docs): string {
  const p = plans.get((item.get("plan") ?? "").toUpperCase());
  const ref = p ? ` (${p.id}` + (p.get("pr") ? `, ${p.get("pr")}` : "") + ")" : "";
  return `- ${item.id}: ${item.get("title")}${ref}`;
}
