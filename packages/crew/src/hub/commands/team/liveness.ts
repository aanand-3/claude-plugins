/** Keeping the team moving (docs/vision.md → Workstream T, autonomy): stale claims, work that keeps bouncing or failing
 * escalated to the Director, and the kill switch — `pause` / `resume`, after which nothing new is staffed or started. */
import type { LedgerEvent } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { fail } from "../../core/text.js";
import { ask, openQuestions } from "./questions.js";
import { notify } from "./autonomy.js";
import { running } from "./activity.js";

const HOUR = 3_600_000;
const ACTIVITY = new Set(["claim", "checkpoint", "move", "log"]);

export interface Stale { ref: string; actor: string; run: string; hours: number }

/** Live claims whose run has done nothing on the plan (no checkpoint, move or log) for `limits.stale_claim_hours`. */
export function staleClaims(store: Store, events = store.ledger.events(), now = Date.now()): Stale[] {
  const limit = store.policy.policy.limits.stale_claim_hours;
  if (limit === null) return [];
  return [...store.ledger.claims(events).values()].flatMap((c) => {
    const last = events.filter((e) => e.ref === c.ref && e.run === c.run && ACTIVITY.has(e.type)).at(-1)?.ts ?? c.ts;
    const hours = (now - Date.parse(last)) / HOUR;
    return hours >= limit ? [{ ref: c.ref!, actor: c.actor, run: c.run, hours: Math.floor(hours) }] : [];
  });
}

/** The pause in force (the last pause not followed by a resume), or null. */
export function paused(events: LedgerEvent[]): LedgerEvent | null {
  const last = events.filter((e) => e.type === "pause" || e.type === "resume").at(-1);
  return last?.type === "pause" ? last : null;
}

export function refuseWhilePaused(store: Store, what: string): void {
  const p = paused(store.ledger.events());
  if (p) fail(`The team is paused (${p.reason ?? "no reason given"}, by ${p.actor} ${p.ts.slice(0, 16).replace("T", " ")}): no ${what}. \`resume\` first.`);
}

/** Pausing and resuming the team is the executive's or the Director's call (a human with no role is the executive). */
function mayPause(store: Store): void {
  const role = store.ledger.who.role;
  if (role && role !== "executive" && role !== "director") fail(`Only the executive or the director pauses or resumes the team; this run is the ${role} role.`);
}

export function pauseTeam(store: Store, reason?: string): void {
  store.require();
  mayPause(store);
  if (paused(store.ledger.events())) fail("The team is already paused.");
  store.ledger.record("pause", null, reason ? { reason } : {});
  notify(store, "paused", null, `team paused by ${store.ledger.who.actor}${reason ? `: ${reason}` : ""}`, new Date().toISOString());
  store.say(`Team paused${reason ? `: ${reason}` : ""}. Runs in flight finish their current step and hand off; \`staff\` and \`start\` refuse until \`resume\`.`);
}

export function resumeTeam(store: Store, note?: string): void {
  store.require();
  mayPause(store);
  if (!paused(store.ledger.events())) fail("The team isn't paused.");
  store.ledger.record("resume", null, note ? { note } : {});
  store.say("Team resumed.");
}

/** `end-run`: mark a stopped or crashed agent's run ended (TaskStop fires no hook), so it stops being live and gives no
 * dispatch entry until it acts again. The executive's or the Director's call. */
export function endRun(store: Store, run: string, note?: string): void {
  store.require();
  const role = store.ledger.who.role;
  if (role && role !== "executive" && role !== "director") fail(`Only the executive or the director ends a run; this run is the ${role} role.`);
  if (!running(store).some((r) => r.run === run)) fail(`${run} is not running.`);
  store.ledger.record("end-run", null, { ended: run, ...(note ? { note } : {}) });
  store.say(`${run} ended: no longer live.`);
}

/** A limit (bounces, attempts) just crossed on a plan: ask the Director, once per crossing. The question blocks the plan. */
export function escalateLimit(store: Store, ref: string, count: number, limit: number | null, what: string): void {
  if (limit === null || count !== limit + 1) return;
  if (openQuestions(store.ledger.events(), ref).some((x) => x.to === "director")) return;
  ask(store, ref, "director", `${ref} ${what} ${count} times (limit ${limit}): decide — re-spec it, reassign it, split it or drop it.`);
}

/** How many times a plan came back from review or a failed land (in-review or accepted → in-progress). */
export const bounces = (events: LedgerEvent[], ref: string) => events.filter((e) => e.type === "move" && e.ref === ref
  && (e.from === "in-review" || e.from === "accepted") && e.to === "in-progress").length;

export const attempts = (events: LedgerEvent[], ref: string) =>
  events.filter((e) => e.type === "checkpoint" && e.ref === ref && e.attempt).length;

/** `check` hints: the pause, and stale claims (the executive view shows them too). */
export function livenessHints(store: Store): string[] {
  const events = store.ledger.events(), p = paused(events);
  return [...(p ? [`team paused by ${p.actor} (${p.reason ?? "no reason given"}) — \`resume\` to staff and start again`] : []),
    ...staleClaims(store, events).map((s) => `${s.ref}: claim by ${s.actor} (${s.run}) is stale — no activity for ${s.hours}h `
      + `(limits.stale_claim_hours); the director may \`reassign ${s.ref}\``)];
}
