/** Orientation: `current` (where am I) and `next` (the single best next step). */
import * as git from "../core/git.js";
import type { Doc } from "../core/doc.js";
import { ACTIVE } from "../core/model.js";
import * as q from "../core/queries.js";
import type { Docs, Store } from "../core/store.js";
import { asDate, byKey, daysBetween, idList, type SortKey, today } from "../core/text.js";

export function current(store: Store): void {
  if (!store.ws.isDir(store.dir)) return;
  const sprint = q.activeSprint(store.sprints());
  if (sprint) store.say(sprintLine(sprint));
  const branch = git.currentBranch() ?? "";
  const m = /^plan\/(P-\d+)/.exec(branch);
  if (!m) {
    const active = [...store.plans(true).values()].filter((p) => ACTIVE.has(p.get("status") ?? ""));
    if (active.length) {
      store.say("project-kit tracker — active plans: " + active.map((p) => `${p.id} (${p.get("status")})`).join(", "));
    }
    return;
  }
  const doc = store.plans().get(m[1]);
  if (!doc) {
    store.say(`project-kit tracker: branch ${branch} has no matching plan file.`);
    return;
  }
  const tasks = doc.tasks();
  const nxt = tasks.find(([d]) => !d)?.[1];
  store.say(`project-kit tracker — current plan ${doc.id}: ${doc.get("title")} `
    + `[${doc.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}`
    + (nxt ? ` — next: ${nxt}` : "")
    + ` — file: ${doc.path ? store.rel(doc.path) : ""}`);
}

function sprintLine(sprint: Doc): string {
  const begin = asDate(sprint.get("start")), end = asDate(sprint.get("end")), now = asDate(today())!;
  const day = begin ? daysBetween(begin, now) + 1 : 0;
  const total = begin && end ? daysBetween(begin, end) + 1 : 0;
  const late = end && now > end ? " (past its end — close it)" : "";
  return `project-kit tracker — sprint ${sprint.id} day ${day}/${total}${late}`;
}

/** In-progress work, then exactly one NEXT line, in priority order. */
export function nextStep(store: Store): void {
  store.require();
  const ctx = new Context(store);
  for (const p of ctx.active) store.say(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.epic]) {
    const line = rule.call(ctx);
    if (line) {
      store.say(`NEXT         ${line}`);
      return;
    }
  }
  store.say("NEXT         nothing planned — create an epic or capture items for the next outcome");
}

/** Everything `next` needs, loaded once; each rule returns a NEXT line or null. */
class Context {
  epics: Docs; items: Docs; plans: Docs;
  morder: Map<string, number>;
  sprint: Doc | null;
  inSprint: Set<string>;
  active: Doc[];

  constructor(readonly store: Store) {
    this.epics = store.epics();
    this.items = store.items();
    this.plans = store.plans(true);
    this.morder = q.milestoneOrder(store.milestones());
    this.sprint = q.activeSprint(store.sprints());
    this.inSprint = new Set(this.sprint ? idList(this.sprint.get("plans")) : []);
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }

  private key(p: Doc): SortKey {
    const eorder = q.epicOrder(this.epics);
    return [!this.inSprint.has(p.id), this.morder.get(q.planMilestone(p, this.epics, this.items)) ?? this.morder.size,
      eorder.get((p.get("epic") ?? "").toUpperCase()) ?? eorder.size, p.id];
  }

  private withStatus(status: string): Doc[] {
    return [...this.plans.values()].filter((p) => p.get("status") === status).sort(byKey((p) => this.key(p)));
  }

  private ranked(status: string): Doc[] {
    return [...this.items.values()].filter((i) => q.itemStatus(i, this.plans) === status)
      .sort(byKey((i) => q.itemRank(i, this.epics, this.morder)));
  }

  expedite(): string | null {
    const bugs = [...this.items.values()].filter((i) => i.id.startsWith("BUG-") && i.get("priority") === "P0"
      && ["new", "triaged"].includes(q.itemStatus(i, this.plans))).map((i) => i.id).sort();
    if (!bugs.length) return null;
    const b = this.items.get(bugs[0])!;
    return `expedite ${b.id}: ${b.get("title")} (P0) → write a fix plan: new-plan … --items ${b.id}`;
  }

  wipFull(): string | null {
    const limit = this.store.settings().wip_limit;
    const wip = this.active.filter((p) => p.get("status") === "in-progress");
    return wip.length >= limit ? `finish ${wip[0].id} (WIP limit ${limit})` : null;
  }

  startReady(): string | null {
    const ready = this.withStatus("ready");
    let startable = ready.filter((p) => !q.unmetDeps(p, this.plans).length);
    for (const p of ready) {
      if (!startable.includes(p)) {
        this.store.say(`WAITING      ${p.id}: ${p.get("title")} — needs ${q.unmetDeps(p, this.plans).join(", ")}`);
      }
    }
    if (this.sprint) {
      const inSprint = startable.filter((p) => this.inSprint.has(p.id));
      if (inSprint.length) startable = inSprint;
    }
    if (!startable.length) return null;
    const p = startable[0];
    const extra = !this.sprint || this.inSprint.has(p.id) ? "" : ` (not in ${this.sprint.id} — unplanned)`;
    return `${p.id}: ${p.get("title")} → tracker.mjs start ${p.id}${extra}`;
  }

  refineDraft(): string | null {
    const [d] = this.withStatus("draft");
    return d ? `refine draft ${d.id}: ${d.get("title")} to meet the Definition of Ready, then move it to ready` : null;
  }

  triage(): string | null {
    const fresh = this.ranked("new");
    return fresh.length ? `triage ${fresh.length} item(s), starting with ${fresh[0].id}: ${fresh[0].get("title")}` : null;
  }

  planItem(): string | null {
    const [i] = this.ranked("triaged");
    if (!i) return null;
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")}, ${i.points() || "?"} pts)`
      + (i.get("epic") ? ` — epic ${i.get("epic")}` : "");
  }

  epic(): string | null {
    const ids = [...this.epics.keys()].sort(byKey((e) => [this.epics.get(e)!.get("status") !== "active", e]));
    const eid = ids.find((e) => ["active", "proposed"].includes(this.epics.get(e)!.get("status") ?? ""));
    return eid ? `break ${eid} down further, or close it once its acceptance criteria are verified` : null;
  }
}
