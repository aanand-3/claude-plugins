/** Sprints: time-boxes that commit plans against capacity; burndown, velocity, review and retro. */
import type { Doc } from "../core/doc.js";
import { CLOSED } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Docs, Store } from "../core/store.js";
import { addDays, asDate, asInt, byKey, daysBetween, fail, fixed, idList, pyRound, stripComments, today } from "../core/text.js";
import { createItem } from "./backlog.js";

export function sprintNew(store: Store, goal: string, start?: string, length?: number): void {
  store.require();
  if (!goal.trim()) fail("A sprint needs a goal (--goal).");
  const s = store.settings();
  const sprints = store.sprints();
  const begin = startDate(start, sprints);
  const end = addDays(begin, (length || s.sprint_length_days) - 1);
  const sid = store.nextId("S", "sprint");
  const doc = store.build("sprint.md", `## Goal\n${goal.trim()}\n`,
    { id: sid, start: begin, end, capacity: String(s.capacity_points) });
  store.writeNew(doc, `${store.dirs.sprint}/${sid}.md`);
  const carry = carryOver(store, sprints);
  if (carry) {
    store.say(`carrying over from ${carry[0]}: ${carry[1].join(", ")}`);
    sprintAdd(store, sid, carry[1]);
  }
}

function startDate(start: string | undefined, sprints: Docs): string {
  if (start) return asDate(start) ?? fail("--start must be YYYY-MM-DD.");
  const ends = [...sprints.values()].map((x) => asDate(x.get("end"))).filter((d): d is string => d !== null).sort();
  return ends.length ? addDays(ends[ends.length - 1], 1) : asDate(today())!;
}

/** Unfinished plans of the last closed sprint that no open sprint has picked up. */
function carryOver(store: Store, sprints: Docs): [string, string[]] | null {
  const closed = closedSprints(sprints);
  if (!closed.length) return null;
  const last = closed[closed.length - 1];
  const plans = store.plans(true);
  const taken = new Set([...sprints.values()].filter((x) => x.get("status") !== "closed").flatMap((x) => idList(x.get("plans"))));
  const carry = idList(last.get("carried_over"))
    .filter((p) => plans.has(p) && !CLOSED.has(plans.get(p)!.get("status") ?? "") && !taken.has(p));
  return carry.length ? [last.id, carry] : null;
}

export function closedSprints(sprints: Docs): Doc[] {
  return [...sprints.values()].filter((x) => x.get("status") === "closed").sort(byKey((x) => [x.id]));
}

export function sprintAdd(store: Store, sid: string, pids: string[]): void {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") === "closed") fail(`${sid} is closed.`);
  const plans = store.plans(true), sprints = store.sprints();
  const committed = idList(sprint.get("plans"));
  for (const pid of pids.map((p) => p.toUpperCase())) {
    checkCommittable(pid, sprint, plans, sprints);
    if (committed.includes(pid)) continue;
    committed.push(pid);
    const p = plans.get(pid)!;
    sprint.appendTo("Committed", `- ${pid}: ${p.get("title")} (${p.points() || "?"} pts)`);
    if (p.get("status") === "draft") store.say(`note: ${pid} is still a draft — get it to ready before the sprint starts`);
  }
  sprint.set("plans", committed.join(", "));
  sprint.save();
  reportCapacity(store, sprint, plans, sprints);
}

function checkCommittable(pid: string, sprint: Doc, plans: Docs, sprints: Docs): void {
  const p = plans.get(pid);
  if (!p) fail(`Plan ${pid} not found.`);
  if (CLOSED.has(p.get("status") ?? "")) fail(`${pid} is already ${p.get("status")}.`);
  const other = [...sprints.values()].filter((x) => x.id !== sprint.id && x.get("status") !== "closed"
    && idList(x.get("plans")).includes(pid));
  if (other.length) fail(`${pid} is already committed to ${other[0].id}.`);
}

function reportCapacity(store: Store, sprint: Doc, plans: Docs, sprints: Docs): void {
  const committed = idList(sprint.get("plans"));
  const total = q.committedPoints(sprint, plans);
  const cap = asInt(sprint.get("capacity")) || store.settings().capacity_points;
  const vel = q.velocity(sprints);
  const limit = vel ? Math.min(cap, Math.trunc(vel)) : cap;
  store.say(`${sprint.id}: ${committed.length} plans, ${total} pts committed (capacity ${cap}`
    + (vel ? `, velocity ${fixed(vel)}` : "") + ")");
  if (total > limit) store.say(`WARNING  ${sprint.id} is over capacity: ${total} > ${limit} pts — drop or split a plan`);
  const unestimated = committed.filter((p) => plans.has(p) && plans.get(p)!.points() === null);
  if (unestimated.length) store.say(`WARNING  unestimated plans: ${unestimated.join(", ")}`);
}

export function sprintStart(store: Store, sid: string): void {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") !== "planned") fail(`${sid} is ${sprint.get("status")}, not planned.`);
  const other = q.activeSprint(store.sprints());
  if (other) fail(`${other.id} is still active — close it first.`);
  const committed = idList(sprint.get("plans"));
  if (!committed.length) fail(`${sid} has no committed plans. \`sprint add ${sid} P-###\` first.`);
  const plans = store.plans(true);
  const notReady = committed.filter((p) => plans.get(p)?.get("status") === "draft");
  if (notReady.length) store.say(`note: not ready yet: ${notReady.join(", ")}`);
  const begin = asDate(sprint.get("start")), now = today();
  if (begin && begin > now) {
    store.say(`WARNING  ${sid} starts ${begin}, in ${daysBetween(now, begin)} day(s) — the burndown counts from then. ` +
      `If work starts today, set start:/end: in ${store.rel(sprint.path ?? "")}.`);
  }
  sprint.set("committed_points", String(q.committedPoints(sprint, plans)));
  sprint.set("status", "active");
  sprint.appendLog(`sprint started — ${sprint.get("committed_points")} pts committed`, "Daily log");
  sprint.save();
  store.say(`${sid}: planned → active (${sprint.get("start")} → ${sprint.get("end")})`);
}

export function sprintClose(store: Store, sid: string, force = false): void {
  store.require();
  const sprint = store.find(sid);
  if (sprint.get("status") !== "active") fail(`${sid} is ${sprint.get("status")}, not active.`);
  const missing = sprint.missing(["Review", "Retro"]);
  if (missing.length && !force) {
    fail(`Write the sprint ${missing.join(" and ")} before closing ${sid} `
      + "(what shipped, what didn't and why; keep / stop / try).");
  }
  const plans = store.plans(true);
  const committed = idList(sprint.get("plans"));
  const done = committed.filter((p) => plans.get(p)?.get("status") === "done");
  const carried = committed.filter((p) => plans.has(p) && !CLOSED.has(plans.get(p)!.get("status") ?? ""));
  const vel = done.reduce((n, p) => n + (plans.get(p)!.points() ?? 0), 0);
  sprint.set("velocity", String(vel));
  sprint.set("unplanned_points", String(unplannedDone(sprint, plans).reduce((n, p) => n + (p.points() ?? 0), 0)));
  sprint.set("carried_over", carried.join(", "));
  sprint.set("status", "closed");
  sprint.set("closed", today());
  sprint.appendLog(`sprint closed — velocity ${vel} pts, ${done.length}/${committed.length} plans done`
    + (carried.length ? `, carried over ${carried.join(", ")}` : ""), "Daily log");
  sprint.save();
  store.say(`${sid}: closed — velocity ${vel} of ${sprint.get("committed_points") || "?"} committed pts`
    + (carried.length ? `; carried over: ${carried.join(", ")} (added to the next \`sprint new\`)` : ""));
  for (const action of retroActions(sprint)) {
    createItem(store, "CHORE", action.slice(0, 70), `## Summary\nRetro action from ${sid}: ${action}\n`, { priority: "P2" });
  }
}

export function unplannedDone(sprint: Doc, plans: Docs): Doc[] {
  const committed = idList(sprint.get("plans"));
  const begin = sprint.get("start") ?? "", end = sprint.get("end") ?? "";
  return [...plans.values()].filter((p) => !committed.includes(p.id) && p.get("status") === "done"
    && begin <= (p.get("completed") ?? "") && (p.get("completed") ?? "") <= end);
}

/** Bullets under **Try:** in the Retro section. */
export function retroActions(sprint: Doc): string[] {
  const out: string[] = [];
  let on = false;
  for (const line of stripComments(sprint.section("Retro")).split("\n")) {
    const s = line.trim();
    if (/^\*\*[^*]+:\*\*.*$/.test(s)) {
      on = s.toLowerCase().startsWith("**try");
      continue;
    }
    if (on && s.startsWith("- ") && s.slice(2).trim()) out.push(s.slice(2).trim());
  }
  return out;
}

export interface BurndownDay { date: string; remaining: number | null; ideal: number }

/** Remaining committed points per day (null after today) against the ideal line. */
export function burndownSeries(sprint: Doc, plans: Docs): { total: number; days: BurndownDay[] } | null {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end"));
  if (!begin || !end) return null;
  const committed = idList(sprint.get("plans")).filter((p) => plans.has(p)).map((p) => plans.get(p)!);
  const total = asInt(sprint.get("committed_points")) || committed.reduce((n, p) => n + (p.points() ?? 0), 0);
  const n = daysBetween(begin, end) + 1;
  const now = asDate(today()) ?? end;
  const last = now < end ? now : end;
  const days: BurndownDay[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(begin, i);
    const ideal = total * (1 - i / Math.max(n - 1, 1));
    const burned = committed.filter((p) => p.get("status") === "done" && (p.get("completed") || "9999") <= date)
      .reduce((s, p) => s + (p.points() ?? 0), 0);
    days.push({ date, ideal, remaining: date > last ? null : total - burned });
  }
  return { total, days };
}

export function burndown(sprint: Doc, plans: Docs, width = 30): string[] {
  const series = burndownSeries(sprint, plans);
  if (!series) return [];
  const { total, days } = series;
  const lines = [`Burndown (${total} pts committed)`, "```"];
  for (const { date, remaining, ideal } of days) {
    if (remaining === null) {
      lines.push(`${date}  ${"".padEnd(width)}  –   (ideal ${fixed(ideal)})`);
      continue;
    }
    const bar = "█".repeat(total ? pyRound(width * remaining / total) : 0);
    lines.push(`${date}  ${bar.padEnd(width)}  ${String(remaining).padStart(3)} (ideal ${fixed(ideal)})`);
  }
  return [...lines, "```"];
}

export function sprintSummary(sprint: Doc, plans: Docs): string[] {
  const goal = stripComments(sprint.section("Goal")).trim();
  const committed = idList(sprint.get("plans"));
  const done = committed.filter((p) => plans.get(p)?.get("status") === "done");
  const pts = (ids: string[]) => ids.reduce((n, p) => n + (plans.get(p)?.points() ?? 0), 0);
  const lines = [`### ${sprint.id} — ${sprint.get("status")} (${sprint.get("start")} → ${sprint.get("end")}${dayLabel(sprint)})`,
    "", `**Goal:** ${goal || "—"}`, "",
    `Committed ${pts(committed)} pts · done ${pts(done)} pts · ${done.length}/${committed.length} plans`
      + (sprint.get("velocity") ? ` · velocity ${sprint.get("velocity")}` : ""), "",
    "| Plan | Title | Pts | Status |", "|---|---|---|---|"];
  for (const p of committed) {
    const d = plans.get(p);
    lines.push(`| ${p} | ${d ? d.get("title") : "?"} | ${d?.points() || "?"} | ${d ? d.get("status") : "missing"} |`);
  }
  return [...lines, "", ...burndown(sprint, plans)];
}

function dayLabel(sprint: Doc): string {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end"));
  if (!(begin && end && sprint.get("status") === "active")) return "";
  const now = asDate(today())!;
  const n = daysBetween(begin, now < end ? now : end) + 1;
  return `, day ${Math.max(n, 0)}/${daysBetween(begin, end) + 1}`;
}

export function sprintShow(store: Store, sid?: string): void {
  store.require();
  const sprints = store.sprints();
  const sprint = sid ? store.find(sid)
    : q.activeSprint(sprints) ?? [...sprints.values()].sort(byKey((s) => [s.id])).pop() ?? null;
  if (!sprint) fail('No sprints yet. `sprint new --goal "…"`.');
  for (const line of sprintSummary(sprint, store.plans(true))) store.say(line);
}
