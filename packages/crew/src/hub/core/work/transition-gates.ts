/** The quality gates a move runs, keyed `<kind>.<status>` by the status a document moves to: `guard()` (commands/work/
 * workflow.ts) runs the check and refuses with `label`; the docs (src/docs/diagrams.ts) name `gate` on the edges into it. */

export interface TransitionGate { gate: string; label: string }

export const TRANSITION_GATES: Record<string, TransitionGate> = {
  "plan.ready": { gate: "Definition of Ready", label: "is not ready (Definition of Ready)" },
  "plan.in-review": { gate: "Learnings recorded", label: "can't go to review" },
  "plan.accepted": { gate: "Tasks, evidence and review", label: "can't be accepted" },
  "plan.done": { gate: "Landed", label: "isn't landed" },
  "goal.active": { gate: "Outcome and criteria written", label: "can't be active" },
  "goal.done": { gate: "Criteria verified", label: "isn't reached" },
  "item.triaged": { gate: "Triage", label: "can't be triaged" },
  "idea.decided": { gate: "Decision agreed", label: "can't be decided" },
};
