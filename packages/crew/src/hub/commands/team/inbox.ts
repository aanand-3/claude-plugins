/** `inbox`: what waits on the human — goals to approve, escalations (how reserved decisions arrive), and plan steps the
 * policy gates to a human. Each entry carries its question, its options, what it holds and the command that answers it;
 * the human runs that command from their own terminal (or answers from the `ui` Inbox page). Read-only. */
import { approvalReason } from "../../core/team/policy.js";
import type { Store } from "../../core/store.js";
import { byKey } from "../../core/text.js";
import { evidence } from "../work/execution.js";
import { reviewProblems } from "../work/review.js";
import { escalationHolds, openQuestions } from "./questions.js";

export interface InboxEntry { kind: "goal" | "escalation" | "approval"; ref: string; about?: string | null; question: string;
  options: string[]; holds: string; how: string }

export function inboxEntries(store: Store): InboxEntry[] {
  const events = store.ledger.events(), policy = store.policy.policy;
  const goals: InboxEntry[] = [...store.goals().values()].filter((g) => g.get("status") === "proposed").sort(byKey((g) => [g.id]))
    .map((g) => ({ kind: "goal", ref: g.id, question: `Approve ${g.id}: ${g.get("title")}?`, options: ["approve", "drop"],
      holds: "its plans and items wait until it is approved",
      how: `move ${g.id} active --approved-by <you> · move ${g.id} dropped --approved-by <you>` }));
  const { held } = escalationHolds(events);
  const escalations: InboxEntry[] = openQuestions(events).filter((q) => q.escalation || q.to === "executive")
    .map((q) => ({ kind: "escalation", ref: q.id, about: q.ref, question: q.text, options: q.options,
      holds: q.ref && held.get(q.ref)?.includes(q.id) ? `holds ${q.ref}` : "stops the team",
      how: `answer ${q.id} "<decision>" --approved-by <you>` }));
  // A plan in review goes to accepted next; listed when a human must approve that and nothing else is missing.
  const approvals: InboxEntry[] = approvalReason(policy, "plan.accepted") === null ? [] : [...store.plans(true).values()]
    .filter((p) => p.get("status") === "in-review" && evidence(store, p).every((e) => e.verify?.ok && e.independent)
      && !reviewProblems(store, p).length)
    .sort(byKey((p) => [p.id]))
    .map((p) => ({ kind: "approval", ref: p.id, question: `Accept ${p.id}: ${p.get("title")}?`, options: ["approve"],
      holds: p.id, how: `move ${p.id} accepted --approved-by <you>` }));
  return [...goals, ...escalations, ...approvals];
}

export function inbox(store: Store, json = false): void {
  store.require();
  const entries = inboxEntries(store);
  if (json) return store.say(JSON.stringify({ entries }));
  if (!entries.length) return store.say("Inbox empty — nothing waits on you.");
  for (const e of entries) {
    store.say(`${e.kind.toUpperCase()}  ${e.ref}${e.about ? ` about ${e.about}` : ""}: ${e.question}`);
    if (e.options.length) store.say(`  options: ${e.options.join(" · ")}`);
    store.say(`  holds:   ${e.holds}`);
    store.say(`  answer:  ${e.how}`);
  }
}
