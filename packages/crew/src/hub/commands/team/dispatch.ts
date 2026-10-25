/** `dispatch`: who works on what next, decided by the hub. One ordered table over the existing gates and helpers — questions,
 * Director exceptions, urgent bugs, release, review, goal closure, in progress, ready, triage, the spec frontier, a stall —
 * one entry per document, cut to `budgets.max_agents`. `/crew:team` launches one agent per entry; it never routes itself. */
import type { Doc } from "../../core/work/doc.js";
import { CLOSED, ITEM_CLOSED, OFF_FOCUS_OK } from "../../core/work/model.js";
import * as q from "../../core/work/queries.js";
import type { Store } from "../../core/store.js";
import { byKey } from "../../core/text.js";
import { evidence } from "../work/execution.js";
import { mergeOrder } from "../work/release.js";
import { reviewProblems } from "../work/review.js";
import { running } from "./activity.js";
import { paused, staleClaims } from "./liveness.js";
import { escalationHolds, openQuestions } from "./questions.js";
import { staffing } from "./team.js";

export interface Entry { role: string; ref: string | null; task: string; resume: string | null }
export interface Dispatch { max_agents: number | null; paused: string | null; entries: Entry[]; more: number }

class View {
  readonly plans: Map<string, Doc>;
  readonly items: Map<string, Doc>;
  readonly goals: Map<string, Doc>;
  readonly focus: string;
  readonly events;
  readonly max: number | null;
  private readonly moved;
  constructor(readonly store: Store) {
    this.plans = store.plans();
    this.items = store.items();
    this.goals = store.goals();
    this.focus = store.focus();
    this.events = store.ledger.events();
    this.max = store.policy.policy.budgets.max_agents;
    this.moved = store.ledger.lastStatus(this.events);
  }
  /** A plan's status: the ledger knows it moved on even where its file doesn't yet. */
  status(p: Doc): string {
    return this.moved.get(p.id) ?? p.get("status") ?? "";
  }
  withStatus(st: string): Doc[] {
    return [...this.plans.values()].filter((p) => this.status(p) === st)
      .sort(byKey((p) => [!q.onFocus(p, this.items, this.focus), p.id]));
  }
  ranked(st: string): Doc[] {
    return q.ranked(this.items, this.goals, this.focus).filter((i) => q.itemStatus(i, this.plans) === st);
  }
  get claims() {
    return this.store.ledger.claims(this.events);
  }
  /** The run of the last event of `type` on a plan (by `role`, when given), or null. */
  lastRun(ref: string, type: string, role?: string): string | null {
    return this.events.filter((e) => e.ref === ref && e.type === type && (!role || e.role === role)).at(-1)?.run ?? null;
  }
}

type Row = (v: View, added: Entry[]) => Entry[];
const entry = (role: string, ref: string | null, task: string, resume: string | null = null): Entry => ({ role, ref, task, resume });
const urgent = (i: Doc) => i.id.startsWith("BUG-") && (i.get("severity") === "S1" || i.get("priority") === "P0");

const ROWS: Row[] = [
  // 1. questions to a role (escalations to the executive are the human's)
  (v) => openQuestions(v.events).filter((x) => !x.escalation && x.to !== v.store.policy.policy.escalation.to)
    .map((x) => entry(x.to, x.id, `answer ${x.id}${x.ref ? ` about ${x.ref}` : ""}: ${x.text}`)),
  // 2. Director exceptions: stale claims, idle runs, blocked plans, a focus goal that is gone while another goal is active
  (v) => staleClaims(v.store, v.events).map((s) => entry("director", s.ref,
    `reassign ${s.ref}: its claim by ${s.actor} (${s.run}) has had no activity for ${s.hours}h`)),
  (v) => running(v.store).filter((r) => r.idle).map((r) => entry("director", r.ref,
    `run ${r.run} on ${r.ref ?? "no document"} idle for ${Math.floor(r.minutes)} min: resume or reassign`)),
  (v) => v.withStatus("blocked").map((p) => entry("director", p.id, `unblock ${p.id}: ${p.get("title")}`)),
  (v) => {
    const g = v.goals.get(v.focus), next = q.goalQueue(v.goals, v.focus)[0];
    return (!g || CLOSED.has(g.get("status") ?? "")) && next && next !== v.focus
      ? [entry("director", next, `focus ${next}: the focus goal ${v.focus || "(none)"} is ${g ? g.get("status") : "not set"}`)] : [];
  },
  // 3. urgent bugs
  (v) => v.ranked("new").filter(urgent).map((i) => entry("pm", i.id, `triage ${i.id}: ${i.get("title")} (urgent)`)),
  // 4. release: merging is serial
  (v) => mergeOrder(v.store).merge.slice(0, 1).map((p) => entry("release", p.id, `merge ${p.id}: ${p.branch} (first in merge-order)`)),
  // 5. in review: a failing check, then the review, then QA's evidence, then completion
  (v) => v.withStatus("in-review").map((p) => {
    const ev = evidence(v.store, p);
    if (ev.some((e) => e.verify && !e.verify.ok)) return entry("developer", p.id, `fix ${p.id}: a check failed`, v.lastRun(p.id, "claim"));
    if (reviewProblems(v.store, p).length) return entry("architect", p.id, `review ${p.id}: ${p.get("title")}`);
    if (ev.some((e) => !(e.verify?.ok && e.independent))) return entry("qa", p.id, `test ${p.id}: ${p.get("title")}`, v.lastRun(p.id, "checkpoint", "qa"));
    return entry("pm", p.id, `complete ${p.id}: move ${p.id} done`);
  }),
  // 6. goal closure
  (v) => {
    const g = v.goals.get(v.focus);
    if (g?.get("status") !== "active") return [];
    const open = q.goalPlans(g.id, v.plans, v.items).some((p) => !CLOSED.has(v.status(p)))
      || q.goalItems(g.id, v.items).some((i) => q.itemStatus(i, v.plans) !== "done");
    return open ? [] : [entry("pm", g.id, `close ${g.id}: verify each criterion, then move ${g.id} done`)];
  },
  // 7. in progress
  (v) => v.withStatus("in-progress").map((p) => {
    const claim = v.claims.get(p.id);
    return claim ? entry("developer", p.id, `continue ${p.id}: resume ${p.id}`, claim.run)
      : entry("developer", p.id, `start ${p.id}: take over its branch`, v.lastRun(p.id, "claim"));
  }),
  // 8. ready to start
  (v) => staffing(v.store).start.filter((p) => v.plans.has(p.id)).map((p) => (p.assigned ? entry(p.assigned, p.id, `start ${p.id}: ${p.title}`)
    : entry("pm", p.id, `assign ${p.id} --to developer${p.team ? ` --team ${p.team}` : ""}: ${p.title}`))),
  // 9. triage
  (v) => v.ranked("new").filter((i) => !urgent(i)).map((i) => entry("pm", i.id, `triage ${i.id}: ${i.get("title")}`)),
  // 10. spec, while fewer plans are ready and unclaimed than max_agents
  (v, added) => {
    const claims = v.claims, ready = v.withStatus("ready").filter((p) => !claims.has(p.id)).length;
    const out: Entry[] = [], room = () => v.max === null || ready + out.length < v.max;
    const drafts = v.withStatus("draft").map((p) => entry("architect", p.id, `spec ${p.id} to ready: ${p.get("title")}`));
    const items = v.ranked("triaged").filter((i) => !i.get("plan") && (!v.focus || (i.get("goal") ?? "").toUpperCase() === v.focus
      || OFF_FOCUS_OK.has(i.id.split("-")[0]))).map((i) => entry("architect", i.id, `write a plan for ${i.id}: ${i.get("title")}`));
    const taken = new Set(added.map((e) => e.ref));
    for (const e of [...drafts, ...items]) if (!taken.has(e.ref) && room()) out.push(e);
    return out;
  },
];

/** Every entry, in table order: held documents and repeated refs dropped (the first wins), then cut to max_agents. */
export function dispatch(store: Store): Dispatch {
  const v = new View(store), p = paused(v.events);
  if (p) return { max_agents: v.max, paused: String(p.reason ?? "no reason given"), entries: [], more: 0 };
  const { held } = escalationHolds(v.events);
  // a document with an open blocking question waits for its answer; the question's entry stands for it
  const asked = new Set(openQuestions(v.events).filter((x) => x.blocking && x.ref).map((x) => x.ref!));
  const all: Entry[] = [], seen = new Set<string>();
  for (const row of ROWS) {
    for (const e of row(v, all)) {
      if (e.ref && (held.has(e.ref) || seen.has(e.ref) || (asked.has(e.ref) && !e.task.startsWith("answer ")))) continue;
      if (e.ref) seen.add(e.ref);
      all.push(e);
    }
  }
  if (!all.length) all.push(...stall(v, held));
  const cut = v.max === null ? all.length : Math.min(v.max, all.length);
  return { max_agents: v.max, paused: null, entries: all.slice(0, cut), more: all.length - cut };
}

/** 11. Nothing can move, but open plans or items exist: one entry for the Director, with the reasons they wait. */
function stall(v: View, held: Map<string, string[]>): Entry[] {
  const open = [...v.plans.values()].some((p) => !CLOSED.has(v.status(p)))
    || [...v.items.values()].some((i) => q.itemStatus(i, v.plans) !== "done" && !ITEM_CLOSED.has(q.itemStatus(i, v.plans)));
  if (!open) return [];
  const why = [...staffing(v.store).waiting.map((w) => `${w.id}: ${w.why}`),
    ...[...held].map(([ref, qs]) => `${ref}: held by ${qs.join(", ")}`)];
  return [entry("director", null, `stall: nothing can move${why.length ? ` — ${why.join("; ")}` : ""}`)];
}

export function dispatchCmd(store: Store, json = false): void {
  store.require();
  const d = dispatch(store);
  if (json) {
    store.say(JSON.stringify(d, null, 2));
    return;
  }
  if (d.paused !== null) {
    store.say(`nothing to dispatch: the team is paused (${d.paused}) — \`resume\` first`);
    return;
  }
  if (!d.entries.length) store.say("nothing to dispatch: no open work");
  for (const e of d.entries) store.say(`DISPATCH  ${e.role}  ${e.ref ?? "-"}  ${e.task}${e.resume ? `  (resume ${e.resume})` : ""}`);
  if (d.more) store.say(`… and ${d.more} more (budgets.max_agents)`);
}
