/** `check`: consistency errors (fail CI) and hints (advice), one function per document kind. */
import { join } from "node:path";
import * as git from "../../core/git.js";
import type { Doc } from "../../core/work/doc.js";
import { decisionProblems, readinessProblems, triageProblems } from "../../core/work/gates.js";
import { ACTIVE, CLOSED, GOAL_FLOW, IDEA_FLOW, ITEM_FLOW, MAX_WRITTEN_AHEAD, PLAN_FLOW, REQUIRED_ON_CREATE } from "../../core/work/model.js";
import * as q from "../../core/work/queries.js";
import { drift, overlapping } from "../../core/work/footprint.js";
import { globRe, K_ID_RE, KNOWLEDGE_TYPES, secretsIn } from "../../core/memory/knowledge.js";
import { legacyHints } from "./legacy.js";
import { agentHints } from "../team/agents.js";
import { livenessHints } from "../team/liveness.js";
import { policyFindings } from "../team/policy.js";
import type { Docs, Store } from "../../core/store.js";
import { idList, stripComments } from "../../core/text.js";

export interface Findings { errors: string[]; hints: string[] }

class Snapshot {
  goals: Docs; items: Docs;
  plans: Docs;     // this worktree
  allPlans: Docs;  // plus live plan branches
  idea: Doc | null;
  focus: string;

  constructor(readonly store: Store) {
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans();
    this.allPlans = store.plans(true);
    this.idea = store.idea();
    this.focus = store.focus();
  }
}

const valid = (flow: object, st: string | null) => st !== null && Object.hasOwn(flow, st);
const up = (s: string | null) => (s ?? "").toUpperCase();

export function findings(store: Store): Findings {
  const s = new Snapshot(store), f: Findings = { errors: [], hints: [] };
  for (const rule of [idea, plans, overlaps, items, goals, ledger, knowledge, hygiene]) rule(s, f);
  const p = policyFindings(store);
  return { errors: [...f.errors, ...p.errors], hints: [...f.hints, ...p.hints, ...agentHints(store), ...livenessHints(store)] };
}

/** Prints findings; returns the exit code (1 when there are errors). */
export function check(store: Store): number {
  store.require();
  const f = findings(store);
  for (const e of f.errors) store.say(`ERROR  ${e}`);
  for (const h of f.hints) store.say(`HINT   ${h}`);
  if (!f.errors.length && !f.hints.length) store.say("Hub OK.");
  return f.errors.length ? 1 : 0;
}

function idea(s: Snapshot, f: Findings): void {
  const i = s.idea;
  if (!i) {
    f.hints.push("no idea.md — write the problem, outcome and success criteria with `new-idea TITLE --from <draft>`");
    return;
  }
  const st = i.get("status");
  if (!valid(IDEA_FLOW, st)) f.errors.push(`IDEA: invalid status '${st}'`);
  if (st === "decided") f.errors.push(...decisionProblems(i).map((p) => `IDEA: decided but ${p}`));
  if (s.focus) {
    const g = s.goals.get(s.focus);
    if (!g) f.errors.push(`IDEA: focus ${s.focus} is not a goal`);
    else if (CLOSED.has(g.get("status") ?? "")) f.hints.push(`focus ${s.focus} is ${g.get("status")} — set the next focus with \`focus G-###\``);
  } else if ([...s.goals.values()].some((g) => !CLOSED.has(g.get("status") ?? ""))) {
    f.hints.push("no focus goal — `focus G-###` so the team works toward one goal at a time");
  }
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
    if (p.get("goal") && !s.goals.has(up(p.get("goal")))) f.errors.push(`${pid}: references missing goal ${p.get("goal")}`);
    if (st === "ready") f.errors.push(...readinessProblems(s.store, p).map((problem) => `${pid}: ready but ${problem}`));
    if (st === "done") donePlan(pid, p, f);
    if (ACTIVE.has(st ?? "")) activePlan(pid, p, s, f, branches, here);
    const outside = drift(s.allPlans.get(pid) ?? p, s.store.baseBranch(), s.store.planHome(pid));
    if (outside?.length) f.hints.push(`${pid}: changes outside its touches: ${outside.slice(0, 8).join(", ")} — widen touches (and log why) or move the work`);
    if ((ACTIVE.has(st ?? "") || st === "ready") && !q.onFocus(p, s.items, s.focus)) {
      f.hints.push(`${pid}: ${st} but does not serve the focus goal ${s.focus} (only bugs and chores may run off focus)`);
    }
  }
}

/** Live plans (from their branches) that are both active and can touch the same files. */
function overlaps(s: Snapshot, f: Findings): void {
  for (const [pid, p] of s.allPlans) {
    if (!ACTIVE.has(p.get("status") ?? "")) continue;
    for (const o of overlapping(p, s.allPlans).filter((x) => ACTIVE.has(s.allPlans.get(x.id)?.get("status") ?? "") && x.id > pid)) {
      f.hints.push(`${pid} and ${o.id} are both active and overlap on ${o.globs.join(", ")} — sequence them (depends_on) or narrow touches`);
    }
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
      const problems = triageProblems(it);
      if (problems.length) f.errors.push(`${iid}: triaged but ${problems.join("; ")}`);
    }
    const owner = up(it.get("plan"));
    if (owner && !s.allPlans.has(owner)) f.errors.push(`${iid}: linked to missing plan ${owner}`);
    if (s.allPlans.get(owner)?.get("status") === "dropped") {
      f.hints.push(`${iid}: its plan ${owner} was dropped — clear \`plan:\` to return it to the backlog`);
    }
    if (it.get("goal") && !s.goals.has(up(it.get("goal")))) f.errors.push(`${iid}: references missing goal ${it.get("goal")}`);
    if (iid.startsWith("BUG-") && it.get("priority") === "P0" && ["new", "triaged"].includes(q.itemStatus(it, s.allPlans))) {
      f.hints.push(`${iid}: P0 bug with no plan — expedite it`);
    }
  }
  const untriaged = [...s.items.values()].filter((it) => it.get("status") === "new");
  if (untriaged.length > 10) f.hints.push(`${untriaged.length} untriaged items — run a triage session`);
}

function goals(s: Snapshot, f: Findings): void {
  for (const [eid, e] of s.goals) {
    const st = e.get("status");
    if (!valid(GOAL_FLOW, st)) f.errors.push(`${eid}: invalid status '${st}'`);
    const missing = e.missing(["Outcome", "Scope", "Acceptance criteria"]);
    if (!CLOSED.has(st ?? "") && missing.length) f.errors.push(`${eid}: skeleton goal — empty ${missing.join(", ")}`);
    const eps = q.goalPlans(eid, s.allPlans, s.items), eitems = q.goalItems(eid, s.items);
    const openItems = eitems.filter((i) => q.itemStatus(i, s.allPlans) !== "done");
    if (eps.length && eps.every((p) => CLOSED.has(p.get("status") ?? "")) && !openItems.length && st === "active") {
      f.hints.push(`${eid}: all plans and items closed — verify acceptance criteria, then \`move ${eid} done\``);
    }
    if (st === "proposed" && eps.some((p) => ["in-progress", "in-review", "blocked", "done"].includes(p.get("status") ?? ""))) {
      f.hints.push(`${eid}: has started plans but is still 'proposed' — \`move ${eid} active\` (on main)`);
    }
    if (!CLOSED.has(st ?? "") && !eps.length && !eitems.length) f.hints.push(`${eid}: no plans and no items — break the goal down`);
  }
}

/** Memory rots: scopes that match nothing, superseded entries still cited, secrets that must never be committed. */
function knowledge(s: Snapshot, f: Findings): void {
  const entries = s.store.knowledge(false);
  if (!entries.length) return;
  const files = git.files(s.store.ws.root);
  const ids = new Set(entries.map((e) => e.id));
  const open = [s.idea, ...s.goals.values(), ...s.allPlans.values()].filter((d): d is Doc => !!d && !CLOSED.has(d.get("status") ?? ""));
  const cited = new Map<string, string[]>();
  for (const d of open) for (const k of d.text.match(K_ID_RE) ?? []) cited.set(k, [...(cited.get(k) ?? []), d.id]);
  for (const e of entries) {
    if (!(KNOWLEDGE_TYPES as readonly string[]).includes(e.type)) f.errors.push(`${e.id}: unknown type '${e.type}'`);
    if (e.supersedes && !ids.has(e.supersedes)) f.errors.push(`${e.id}: supersedes missing ${e.supersedes}`);
    const secrets = secretsIn(e.doc.text, s.store.policy.policy.secrets.patterns);
    if (secrets.length) f.errors.push(`${e.id}: looks like it contains a secret (${secrets.join(", ")}) — remove it and rotate the secret`);
    for (const glob of e.scope) {
      if (!files.some((p) => globRe(glob).test(p))) f.hints.push(`${e.id}: scope '${glob}' matches no file — update the scope or supersede the entry`);
    }
    if (e.supersededBy && cited.has(e.id)) {
      f.hints.push(`${e.id}: superseded by ${e.supersededBy} but still cited in ${cited.get(e.id)!.join(", ")}`);
    }
    if (e.type === "risk" && !e.doc.get("owner") && !e.supersededBy) f.hints.push(`${e.id}: risk with no owner`);
  }
}

/** The ledger and the documents must tell the same story. */
function ledger(s: Snapshot, f: Findings): void {
  const events = s.store.ledger.events();
  for (const [ref, claim] of s.store.ledger.claims(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && CLOSED.has(st)) f.hints.push(`${ref}: ${st} but still claimed by ${claim.actor} — \`release ${ref}\``);
  }
  for (const [ref, last] of s.store.ledger.lastStatus(events)) {
    const st = s.allPlans.get(ref)?.get("status");
    if (st && st !== last) f.hints.push(`${ref}: the ledger last moved it to ${last}, but the plan says ${st} (edited by hand?)`);
  }
}

function hygiene(s: Snapshot, f: Findings): void {
  const ahead = [...s.allPlans.values()].filter((p) => ["draft", "ready"].includes(p.get("status") ?? ""));
  if (ahead.length > MAX_WRITTEN_AHEAD) {
    f.hints.push(`${ahead.length} plans written ahead of the work (> ${MAX_WRITTEN_AHEAD}) — keep later work as backlog items so plans don't go stale`);
  }
  const leftovers = s.store.ws.list(join(s.store.dir, "drafts")).filter((n) => n.endsWith(".md"));
  if (leftovers.length) {
    f.hints.push(`unconverted drafts in .crew/drafts/: ${leftovers.join(", ")} — create the document from them or delete`);
  }
  if (s.store.ws.isDir(join(s.store.ws.root, ".project"))) {
    f.hints.push("a .project/ directory from project-kit is still here — `crew.mjs migrate` moves it into .crew/");
  }
  if (!s.store.ws.read(join(s.store.ws.root, ".githooks", "post-commit"))?.includes("graphify")) {
    f.hints.push("code graph not set up (no graphify hook in .githooks/post-commit) — `/crew:codemap` installs and wires it");
  }
  f.hints.push(...legacyHints(s.store));
}
