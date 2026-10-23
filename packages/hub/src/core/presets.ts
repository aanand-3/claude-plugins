/** Policy presets: a named layer a project opts into with `preset: <name>` in .crew/policy.yaml, applied between the org
 * layers and the project's own (so the project can still adjust it). `lifecycle` turns the team's RACI into gates
 * (docs/vision.md → Workstream T): the human approves the goal set, each step belongs to one role. */
type Raw = Record<string, unknown>;

const DRAFTS = { paths: { write: [".crew/drafts/**"] } }; // roles that only write drafts for the hub

export const PRESETS: Record<string, { global: Raw; roles: Record<string, Raw> }> = {
  lifecycle: {
    global: {
      mode: "ai-native",
      human_gates: ["goal.active"],
      role_gates: {
        "item.triaged": "pm",            // only the PM triages and ranks
        "plan.ready": "architect",       // only the Architect makes a spec ready
        "plan.assigned": "pm",           // the PM opens a plan for a developer; `start` then needs that assignment
        "plan.in-progress": "developer", // only the assigned developer implements (and fixes what comes back)
        "plan.in-review": "developer",   // … and hands over to test
        "plan.done": "pm",               // the PM completes, against QA's evidence
        "plan.dropped": "pm",
        "goal.done": "director",         // the Director closes a goal the PM has verified
      },
    },
    roles: { director: DRAFTS, pm: DRAFTS, qa: DRAFTS, release: DRAFTS },
  },
};
