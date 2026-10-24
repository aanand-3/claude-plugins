/** Questions between roles, recorded instead of lost in chat: `ask` (to a role), `escalate` (to the executive), `answer`.
 * An open, blocking question on a document stops that document moving forward — nothing else. */
import { randomBytes } from "node:crypto";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { fail, kindOf } from "../../core/text.js";
import { learn } from "../memory/knowledge.js";
import { notify } from "./autonomy.js";

export interface Question { id: string; ref: string | null; to: string; text: string; by: string; run: string; ts: string;
  blocking: boolean; escalation: boolean; answer: { text: string; by: string; ts: string } | null }

/** Every question in the ledger, with its answer if there is one. */
export function questions(events: LedgerEvent[]): Question[] {
  const byId = new Map<string, Question>();
  for (const e of events) {
    if (e.type === "ask") {
      byId.set(String(e.qid), { id: String(e.qid), ref: e.ref, to: String(e.to), text: String(e.text), by: e.actor, run: e.run, ts: e.ts,
        blocking: e.blocking !== false, escalation: e.escalation === true, answer: null });
    } else if (e.type === "answer" && byId.has(String(e.qid))) {
      byId.get(String(e.qid))!.answer = { text: String(e.text), by: String(e.approved_by ?? e.actor), ts: e.ts };
    }
  }
  return [...byId.values()];
}

export const openQuestions = (events: LedgerEvent[], ref?: string) =>
  questions(events).filter((q) => !q.answer && (!ref || q.ref === ref));

/** Open escalations split by what they stop: one about a plan or an item holds that document only (`held`: ref → question
 * IDs); one with no ref, or about the idea or a goal, stops the whole team (`stops`). */
export function escalationHolds(events: LedgerEvent[]): { held: Map<string, string[]>; stops: Question[] } {
  const held = new Map<string, string[]>(), stops: Question[] = [];
  for (const q of openQuestions(events).filter((x) => x.escalation || x.to === "executive")) {
    const kind = q.ref ? kindOf(q.ref) : null;
    if (q.ref && (kind === "plan" || kind === "item")) held.set(q.ref, [...(held.get(q.ref) ?? []), q.id]);
    else stops.push(q);
  }
  return { held, stops };
}

/** Moves that take a document forward; an open blocking question stops these (blocked, dropped and going back stay allowed). */
export const FORWARD = new Set(["ready", "in-progress", "in-review", "done", "active", "decided", "triaged"]);

export function ask(store: Store, ref: string | undefined, to: string, text: string, o: { fyi?: boolean; escalation?: boolean } = {}): string {
  store.require();
  const id = ref?.toUpperCase();
  if (id) {
    if (!kindOf(id)) fail(`Unrecognised ID '${id}'.`);
    store.find(id);
  }
  const roles = store.policy.roles;
  if (!roles.includes(to)) fail(`--to must be one of ${roles.join(", ")}.`);
  if (!text.trim()) fail("Ask a question.");
  const qid = `Q-${randomBytes(3).toString("hex")}`;
  store.ledger.record("ask", id ?? null, { qid, to, text, ...(o.fyi ? { blocking: false } : {}), ...(o.escalation ? { escalation: true } : {}) });
  store.say(`${qid} → ${to}${id ? ` about ${id}` : ""}${o.fyi ? "" : id ? ` (blocks ${id} until answered)` : ""}`);
  if (o.escalation || to === "executive") notify(store, "escalation", id ?? null, `${qid}: ${text}`, qid);
  return qid;
}

/** To the executive (the policy's escalation target): for reserved decisions, a goal at risk, or anything only a human can settle. */
export function escalate(store: Store, ref: string | undefined, text: string): string {
  return ask(store, ref, store.policy.policy.escalation.to, text, { escalation: true });
}

export interface AnswerOptions { decision?: boolean; scope?: string; approvedBy?: string }

/** Answer a question. Escalations are answered by a human (--approved-by, CLI only); a durable answer becomes a decision entry. */
export function answer(store: Store, qid: string, text: string, o: AnswerOptions = {}): void {
  store.require();
  const q = questions(store.ledger.events()).find((x) => x.id === qid.toLowerCase().replace(/^q-/, "Q-"))
    ?? fail(`No question ${qid}.`);
  if (q.answer) fail(`${q.id} was already answered by ${q.answer.by}: ${q.answer.text}`);
  if (!text.trim()) fail("Give the answer.");
  if ((q.escalation || q.to === "executive") && !o.approvedBy) {
    fail(`${q.id} is an escalation to the ${q.to}: a human answers it with \`crew.mjs answer ${q.id} "…" --approved-by <name>\` (agents can't).`);
  }
  const who = store.ledger.who;
  if (!o.approvedBy && who.run === q.run) fail(`${q.id} was asked by this run; the ${q.to} answers it, not the asker.`);
  if (!o.approvedBy && who.role !== q.to) {
    fail(`${q.id} is for the ${q.to} role; this run is ${who.role ? `the ${who.role} role` : "in no role"} (CREW_ROLE). `
      + "A human can answer for the role with --approved-by <name>.");
  }
  store.ledger.record("answer", q.ref, { qid: q.id, text, ...(o.approvedBy ? { approved_by: o.approvedBy } : {}) });
  store.say(`${q.id} answered${q.ref ? ` — ${q.ref} is unblocked` : ""}`);
  if (o.decision) {
    learn(store, "decision", text, { why: `Answer to ${q.id} (${q.to}): ${q.text}`, scope: o.scope, source: q.ref ?? undefined });
  }
}

export function listQuestions(store: Store, o: { to?: string; ref?: string; all?: boolean; json?: boolean } = {}): void {
  store.require();
  const qs = questions(store.ledger.events()).filter((q) => (o.all || !q.answer) && (!o.to || q.to === o.to)
    && (!o.ref || q.ref === o.ref.toUpperCase()));
  if (o.json) {
    for (const q of qs) store.say(JSON.stringify(q));
    return;
  }
  if (!qs.length) store.say(o.all ? "No questions." : "No open questions.");
  for (const q of qs) {
    store.say(`${q.id}  ${q.escalation ? "ESCALATION " : ""}${q.by} → ${q.to}${q.ref ? ` about ${q.ref}` : ""}: ${q.text}`
      + (q.answer ? `  — answered by ${q.answer.by}: ${q.answer.text}` : q.blocking && q.ref ? "  (blocking)" : ""));
  }
}
