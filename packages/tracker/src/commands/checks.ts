/** `check`: consistency errors (fail CI) and hints (advice), one function per document kind. */
import { join } from "node:path";
import * as git from "../core/git.js";
import type { Doc } from "../core/doc.js";
import { readinessProblems, triageProblems } from "../core/gates.js";
import { ACTIVE, CLOSED, EPIC_FLOW, ITEM_FLOW, MAX_WRITTEN_AHEAD, MILESTONE_FLOW, PLAN_FLOW, REQUIRED_ON_CREATE,
  SPRINT_FLOW } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Docs, Store } from "../core/store.js";
import { asInt, idList, stripComments, today } from "../core/text.js";

export interface Findings { errors: string[]; hints: string[] }

class Snapshot {
  epics: Docs; items: Docs; milestones: Docs; sprints: Docs;
  plans: Docs;     // this worktree
  allPlans: Docs;  // plus live plan branches
  now = today();

  constructor(readonly store: Store) {
    this.epics = store.epics();
    this.items = store.items();
    this.milestones = store.milestones();
    this.sprints = store.sprints();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
  }
}

const valid = (flow: object, st: string | null) => st !== null && Object.hasOwn(flow, st);
const up = (s: string | null) => (s ?? "").toUpperCase();

export function findings(store: Store): Findings {
  const s = new Snapshot(store), f: Findings = { errors: [], hints: [] };
  for (const rule of [plans, items, sprints, milestones, epics, risks, hygiene]) rule(s, f);
  return f;
}

/** Prints findings; returns the exit code (1 when there are errors). */
export function check(store: Store): number {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Tracker OK.");
  return f.errors.length ? 1 : 0;
}

function plans(s: Snapshot, f: Findings): void {
  const branches = new Set(git.planBranches());
  const here = git.currentBranch();
  for (const [pid, p] of s.plans) {
    const st = p.get("status");
    if (!valid(PLAN_FLOW, st)) f.errors.push(`${pid}: invalid status '${st}'`);
    const missing = p.missing(REQUIRED_ON_CREATE.plan);
    if (!CLOSED.has(st ?? "") && missing.length) {
      f.errors.push(`${pid}: skeleton plan — empty ${missing.join(", ")} (write it or delete it; `
        + "unscheduled ideas belong in backlog items)");
    }
    const unknownDeps = p.dependsOn().filter((d) => !s.allPlans.has(d));
    if (unknownDeps.length) f.errors.push(`${pid}: depends on unknown ${unknownDeps.join(", ")}`);
    const unknownItems = idList(p.get("items")).filter((i) => !s.items.has(i));
    if (unknownItems.length) f.errors.push(`${pid}: links unknown items ${unknownItems.join(", ")}`);
    if (p.get("epic") && !s.epics.has(up(p.get("epic")))) f.errors.push(`${pid}: references missing epic ${p.get("epic")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s, f, branches, here);
  }
}

function donePlan(pid: string, p: Doc, f: Findings): void {
  if (p.tasks().some(([d]) => !d)) f.errors.push(`${pid}: done but has unchecked tasks`);
  if (!stripComments(p.section("Outcome")).trim()) f.errors.push(`${pid}: done but Outcome section is empty`);
}

function activePlan(pid: string, p: Doc, s: Snapshot, f: Findings, branches: Set<string>, here: string | null): void {
  const st = p.get("status");
  const waits = q.unmetDeps(p, s.allPlans);
  if (waits.length) f.hints.push(`${pid}: ${st} while dependencies are unfinished: ${waits.join(", ")}`);
  if (!p.tasks().length || !p.hasContent("Acceptance criteria")) f.errors.push(`${pid}: ${st} but has no tasks or acceptance criteria`);
  const branch = p.get("branch");
  if ((st === "in-progress" || st === "in-review") && !branches.has(branch ?? "") && here !== branch) {
    f.hints.push(`${pid}: ${st} but branch ${branch} not found locally`);
  }
}

function items(s: Snapshot, f: Findings): void {
  for (const [iid, it] of s.items) {
    const st = it.get("status");
    if (!valid(ITEM_FLOW, st)) f.errors.push(`${iid}: invalid status '${st}'`);
    if (st === "triaged") {
      const problems = triageProblems(s.store, it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner = up(it.get("plan"));
    if (owner && !s.allPlans.has(owner)) f.errors.push(`${iid}: linked to missing plan ${owner}`);
    if (s.allPlans.get(owner)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner} was dropped — clear \`plan:\` to return it to the backlog`);
    }
    for (const [key, known] of [["epic", s.epics], ["milestone", s.milestones]] as const) {
      if (it.get(key) && !known.has(up(it.get(key)))) f.errors.push(`${iid}: references missing ${key} ${it.get(key)}`);
    }
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(q.itemStatus(it, s.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan — expedite it`);
    }
  }
  const untriaged = [...s.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items — run a triage session`);
}

function sprints(s: Snapshot, f: Findings): void {
  const active = [...s.sprints.values()].filter((sp) => sp.get("status") === "active");
  if (active.length > 1) f.errors.push(`more than one active sprint: ${active.map((sp) => sp.id).join(", ")}`);
  for (const [sid, sp] of s.sprints) {
    if (!valid(SPRINT_FLOW, sp.get("status"))) f.errors.push(`${sid}: invalid status '${sp.get("status")}'`);
    const unknown = idList(sp.get("plans")).filter((p) => !s.allPlans.has(p));
    if (unknown.length) f.errors.push(`${sid}: commits unknown plans ${unknown.join(", ")}`);
    if (sp.get("status") === "active" && (sp.get("end") || "9999") < s.now) {
      f.hints.push(`${sid}: ended ${sp.get("end")} — write Review and Retro, then \`sprint close ${sid}\``);
    }
    if (sp.get("status") !== "closed") {
      const total = q.committedPoints(sp, s.allPlans);
      const cap = asInt(sp.get("capacity")) || s.store.settings().capacity_points;
      if (total > cap) f.hints.push(`${sid}: ${total} pts committed > capacity ${cap}`);
    }
  }
}

function milestones(s: Snapshot, f: Findings): void {
  for (const [mid, m] of s.milestones) {
    if (!valid(MILESTONE_FLOW, m.get("status"))) f.errors.push(`${mid}: invalid status '${m.get("status")}'`);
    if (["planned", "active"].includes(m.get("status") ?? "") && (m.get("target") || "9999") < s.now) {
      f.hints.push(`${mid}: target ${m.get("target")} has passed — release it, or re-plan and record why`);
    }
  }
}

function epics(s: Snapshot, f: Findings): void {
  for (const [eid, e] of s.epics) {
    const st = e.get("status");
    if (!valid(EPIC_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton epic — empty ${missing.join(", ")}`);
    if (e.get("milestone") && !s.milestones.has(up(e.get("milestone")))) {
      f.errors.push(`${eid}: references missing milestone ${e.get("milestone")}`);
    }
    const eps = q.epicPlans(eid, s.allPlans), eitems = q.epicItems(eid, s.items);
    const openItems = eitems.filter((i) => q.itemStatus(i, s.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed — verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' — \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items — break the epic down`);
  }
}

function risks(s: Snapshot, f: Findings): void {
  for (const r of s.store.openRisks()) {
    if (!r.owner || !r.mitigation) f.hints.push(`risk ${r.id || r.risk || "?"}: no owner or mitigation`);
  }
}

function hygiene(s: Snapshot, f: Findings): void {
  const ahead = [...s.plans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  const openSprints = [...s.sprints.values()].filter((sp) => sp.get("status") !== "closed");
  const committed = new Set(openSprints.flatMap((sp) => idList(sp.get("plans"))));
  const stray = openSprints.length ? ahead.filter((p) => !committed.has(p.id)) : ahead;
  if (stray.length > MAX_WRITTEN_AHEAD) {
    const where = openSprints.length ? "not committed to a current/next sprint" : `written ahead of the work (> ${MAX_WRITTEN_AHEAD})`;
    f.hints.push(`${stray.length} plans ${where} — keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s.store.ws.list(join(s.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .project/drafts/: ${leftovers.join(", ")} — create the document from them or delete`);
  }
  if (s.store.ws.list(s.store.dir).includes("backlog.md")) { // exact name: BACKLOG.md is generated
    f.hints.push("legacy .project/backlog.md — capture its entries with `new-item … --why`, then delete it");
  }
  if (!s.store.ws.isFile(join(s.store.dir, "project-plan.md"))) {
    f.hints.push("no project-plan.md — `new-doc project-plan --from <draft>` (cadence and capacity use defaults)");
  }
}
