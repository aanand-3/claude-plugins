/** Workflow runs in the ledger: a multi-step job (kickoff, onboard) records each step as it finishes, so an interrupted run —
 * or another session or agent — resumes from the first step not done. `checkpoint --workflow W --step S [--skip]`,
 * `resume --workflow W`. Kickoff and onboard track their progress this way. */
import type { LedgerEvent } from "../core/ledger.js";
import type { Store } from "../core/store.js";
import { fail } from "../core/text.js";

export const WORKFLOWS: Record<string, readonly string[]> = {
  kickoff: ["preflight", "discover", "design", "guidelines", "hub", "git", "graph", "idea-and-plan"],
  onboard: ["preflight", "map", "discover", "design", "guidelines", "hub", "git", "graph"],
};

const steps = (name: string) => WORKFLOWS[name] ?? fail(`Unknown workflow '${name}'. Workflows: ${Object.keys(WORKFLOWS).join(", ")}.`);

export function recordStep(store: Store, workflow: string, step: string | undefined, o: { skip?: boolean; note?: string } = {}): void {
  store.require();
  const all = steps(workflow);
  if (!step) fail(`Name the step: --step ${all.join("|")}.`);
  if (!all.includes(step)) fail(`${workflow} has no step '${step}'. Steps: ${all.join(", ")}.`);
  const state = o.skip ? "skipped" : "done";
  store.ledger.record("checkpoint", null, { workflow, step, state, ...(o.note ? { note: o.note } : {}) });
  store.say(`${workflow}: ${step} ${state}`);
}

/** Each step's latest record (a step can be redone), in the workflow's order. */
export function workflowState(events: LedgerEvent[], workflow: string): { step: string; event: LedgerEvent | null }[] {
  const last = new Map<string, LedgerEvent>();
  for (const e of events) if (e.type === "checkpoint" && e.workflow === workflow) last.set(String(e.step), e);
  return steps(workflow).map((step) => ({ step, event: last.get(step) ?? null }));
}

export function resumeWorkflow(store: Store, workflow: string, json = false): void {
  store.require();
  const state = workflowState(store.ledger.events(), workflow);
  const next = state.find((s) => !s.event)?.step ?? null;
  if (json) {
    store.say(JSON.stringify({ workflow, next, steps: state.map(({ step, event }) =>
      ({ step, state: event ? event.state : "pending", by: event?.actor ?? null, role: event?.role ?? null, ts: event?.ts ?? null })) }));
    return;
  }
  if (!state.some((s) => s.event)) store.say(`${workflow}: not started — begin with ${state[0].step}`);
  for (const { step, event } of state) {
    store.say(`  ${(event ? String(event.state) : "pending").padEnd(8)} ${step}`
      + (event ? `  (${event.actor}${event.role ? `, ${event.role}` : ""}, ${event.ts.slice(0, 16).replace("T", " ")})${event.note ? ` — ${event.note}` : ""}` : ""));
  }
  store.say(next ? `next: ${next}` : `${workflow}: every step is done or skipped`);
}
