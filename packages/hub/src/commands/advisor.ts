/** Orientation: `current` (where am I) and `next` (the single best next step). */
import * as git from "../core/git.js";
import type { Doc } from "../core/doc.js";
import { ACTIVE } from "../core/model.js";
import * as q from "../core/queries.js";
import { roleLines } from "./roles.js";
import type { Docs, Store } from "../core/store.js";
import { byKey, type SortKey } from "../core/text.js";

export function current(store: Store): void {
  if (!store.ws.isDir(store.dir)) return;
  const focus = store.focus();
  if (focus) store.say(`crew hub — focus ${focus}: ${store.goals().get(focus)?.get("title") ?? "(missing goal)"}`);
  const branch = git.currentBranch() ?? "";
  const m = /^plan\/(P-\d+)/.exec(branch);
  if (!m) {
    const active = [...store.plans(true).values()].filter((p) => ACTIVE.has(p.get("status") ?? ""));
    if (active.length) {
      store.say("crew hub — active plans: " + active.map((p) => `${p.id} (${p.get("status")})`).join(", "));
    }
    return;
  }
  const doc = store.plans().get(m[1]);
  if (!doc) {
    store.say(`crew hub: branch ${branch} has no matching plan file.`);
    return;
  }
  const tasks = doc.tasks();
  const nxt = tasks.find(([d]) => !d)?.[1];
  store.say(`crew hub — current plan ${doc.id}: ${doc.get("title")} `
    + `[${doc.get("status")}] tasks ${tasks.filter(([d]) => d).length}/${tasks.length}`
    + (nxt ? ` — next: ${nxt}` : "")
    + ` — file: ${doc.path ? store.rel(doc.path) : ""}`);
}

/** In-progress work, then exactly one NEXT line, in priority order. */
export function nextStep(store: Store, role?: string): void {
  store.require();
  for (const line of role ? roleLines(store, role) : nextLines(store)) store.say(line);
}

/** The lines `next` prints (also shown on the UI's overview). */
export function nextLines(store: Store): string[] {
  const ctx = new Context(store);
  for (const p of ctx.active) ctx.lines.push(`IN PROGRESS  ${p.id}: ${p.get("title")} [${p.get("status")}]`);
  for (const rule of [ctx.expedite, ctx.wipFull, ctx.startReady, ctx.refineDraft, ctx.triage, ctx.planItem, ctx.idea, ctx.goal]) {
    const line = rule.call(ctx);
    if (line) return [...ctx.lines, `NEXT         ${line}`];
  }
  return [...ctx.lines, "NEXT         nothing planned — write a goal for the next outcome, or capture items"];
}

/** Everything `next` needs, loaded once; each rule returns a NEXT line or null. */
class Context {
  goals: Docs; items: Docs; plans: Docs;
  focus: string;
  active: Doc[];
  lines: string[] = [];

  constructor(readonly store: Store) {
    this.goals = store.goals();
    this.items = store.items();
    this.plans = store.plans(true);
    this.focus = store.focus();
    this.active = [...this.plans.values()].filter((p) => ACTIVE.has(p.get("status") ?? "")).sort(byKey((p) => this.key(p)));
  }

  /** Focus work first, then goal order, then ID. */
  private key(p: Doc): SortKey {
    const eorder = q.goalOrder(this.goals);
    return [!q.onFocus(p, this.items, this.focus), eorder.get(q.planGoal(p, this.items)) ?? eorder.size, p.id];
  }

  private withStatus(status: string): Doc[] {
    return [...this.plans.values()].filter((p) => p.get("status") === status).sort(byKey((p) => this.key(p)));
  }

  private ranked(status: string): Doc[] {
    return q.ranked(this.items, this.goals, this.focus).filter((i) => q.itemStatus(i, this.plans) === status);
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
    const startable = ready.filter((p) => !q.unmetDeps(p, this.plans).length);
    for (const p of ready) {
      if (!startable.includes(p)) {
        this.lines.push(`WAITING      ${p.id}: ${p.get("title")} — needs ${q.unmetDeps(p, this.plans).join(", ")}`);
      }
    }
    if (!startable.length) return null;
    const p = startable[0];
    const off = q.onFocus(p, this.items, this.focus) ? "" : ` (off focus ${this.focus})`;
    return `${p.id}: ${p.get("title")} → crew.mjs start ${p.id}${off}`;
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
    return `write a plan for ${i.id}: ${i.get("title")} (${i.get("priority")})` + (i.get("goal") ? ` — goal ${i.get("goal")}` : "");
  }

  idea(): string | null {
    const idea = this.store.idea();
    if (!idea) return "write the idea (problem, outcome, success criteria) → new-idea TITLE --from DRAFT";
    const st = idea.get("status");
    return st === "decided" || st === "killed" ? null : `take the idea from ${st} to a decision (go / pivot / kill)`;
  }

  goal(): string | null {
    const ids = [...this.goals.keys()].sort(byKey((e) => [e !== this.focus, this.goals.get(e)!.get("status") !== "active", e]));
    const gid = ids.find((e) => ["active", "proposed"].includes(this.goals.get(e)!.get("status") ?? ""));
    return gid ? `break ${gid} down further, or close it once its acceptance criteria are verified` : null;
  }
}
