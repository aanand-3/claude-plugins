/** Human follow-ups (FEAT-068): when the executive's answer leaves a step to them (merge a branch, run a command), the step
 * is recorded as one more open question to the executive about the document it unblocks — an `ask` event with `after` (the
 * answered Q-…) and `step`. It reuses every wait path of an open question and closes when a human answers it `done`. */
import { randomBytes } from "node:crypto";
import type { LedgerEvent } from "../../core/memory/ledger.js";
import type { Store } from "../../core/store.js";
import { fail, kindOf } from "../../core/text.js";
import { answer, type AnswerOptions, openQuestions, questions } from "./questions.js";

/** Answer `qid`, then record `step` as a follow-up about `unblocks` (or the question's own document). Every check runs
 * before anything is recorded. */
export function answerWithFollowUp(store: Store, qid: string, text: string, o: AnswerOptions, step: string, unblocks?: string): string {
  store.require();
  if (!o.approvedBy) fail("--follow-up records a step for a human: give --approved-by <name> (agents can't).");
  if (!step.trim()) fail("--follow-up needs the step you will do.");
  const q = questions(store.ledger.events()).find((x) => x.id === qid.toLowerCase().replace(/^q-/, "Q-")) ?? fail(`No question ${qid}.`);
  const target = unblocks?.toUpperCase() ?? q.ref
    ?? fail(`${q.id} is about no document: name the plan or item the step holds with --unblocks P-###|ITEM.`);
  const kind = kindOf(target);
  if (kind !== "plan" && kind !== "item") fail(`--unblocks: a follow-up holds a plan or an item, not ${target}.`);
  store.find(target);
  answer(store, q.id, text, o);
  const id = `Q-${randomBytes(3).toString("hex")}`;
  store.ledger.record("ask", target, { qid: id, to: "executive", text: `follow-up (after ${q.id}): ${step.trim()}`, after: q.id,
    step: step.trim(), approved_by: o.approvedBy });
  store.say(`${id} → executive about ${target}: follow-up stays in your inbox until done `
    + `(answer ${id} "done" --approved-by <you>)`);
  return id;
}

/** The open follow-ups (open questions whose `ask` event carries `after`): Q-id → the step. */
export function openFollowUps(events: LedgerEvent[]): Map<string, string> {
  const steps = new Map(events.filter((e) => e.type === "ask" && e.after).map((e) => [String(e.qid), String(e.step ?? "")]));
  return new Map(openQuestions(events).filter((q) => steps.has(q.id)).map((q) => [q.id, steps.get(q.id)!]));
}
